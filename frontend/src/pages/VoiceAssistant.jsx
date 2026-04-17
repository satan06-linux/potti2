import { useState, useRef, useEffect } from 'react'
import { Mic, MicOff, Send, Volume2, Globe, Music, Play, Pause, SkipForward, SkipBack, Volume1, VolumeX } from 'lucide-react'
import api from '../api'
import './VoiceAssistant.css'

const LANGS = { en: 'English', hi: 'हिंदी', te: 'తెలుగు' }

// Calming tunes using Web Audio API — generated tones, no file needed
const TUNES = [
  { id: 1, name: 'Calm Ocean',      emoji: '🌊', bpm: 60,  color: '#3b82f6', freq: [261, 329, 392], type: 'sine',     desc: 'Gentle waves' },
  { id: 2, name: 'Forest Birds',    emoji: '🌿', bpm: 80,  color: '#10b981', freq: [523, 659, 784], type: 'sine',     desc: 'Nature sounds' },
  { id: 3, name: 'Soft Piano',      emoji: '🎹', bpm: 70,  color: '#8b5cf6', freq: [440, 554, 659], type: 'triangle', desc: 'Relaxing melody' },
  { id: 4, name: 'Healing Bells',   emoji: '🔔', bpm: 50,  color: '#f59e0b', freq: [528, 639, 741], type: 'sine',     desc: 'Solfeggio tones' },
  { id: 5, name: 'Deep Meditation', emoji: '🧘', bpm: 40,  color: '#6366f1', freq: [174, 285, 396], type: 'sine',     desc: 'Deep relaxation' },
  { id: 6, name: 'Morning Light',   emoji: '☀️', bpm: 90,  color: '#f97316', freq: [396, 528, 639], type: 'triangle', desc: 'Uplifting tones' },
  { id: 7, name: 'Rain & Thunder',  emoji: '🌧️', bpm: 55,  color: '#64748b', freq: [220, 277, 330], type: 'sawtooth', desc: 'Rainy ambience' },
  { id: 8, name: 'Lullaby',         emoji: '🌙', bpm: 65,  color: '#a78bfa', freq: [349, 440, 523], type: 'triangle', desc: 'Gentle sleep aid' },
]

function useMusicPlayer() {
  const audioCtxRef = useRef(null)
  const nodesRef    = useRef([])
  const gainRef     = useRef(null)
  const intervalRef = useRef(null)
  const [playing, setPlaying]   = useState(false)
  const [current, setCurrent]   = useState(null)
  const [volume, setVolume]     = useState(0.4)

  const getCtx = () => {
    if (!audioCtxRef.current) audioCtxRef.current = new (window.AudioContext || window.webkitAudioContext)()
    return audioCtxRef.current
  }

  const stopAll = () => {
    nodesRef.current.forEach(n => { try { n.stop() } catch {} })
    nodesRef.current = []
    clearInterval(intervalRef.current)
    setPlaying(false)
  }

  const playTune = (tune) => {
    stopAll()
    const ctx = getCtx()
    if (ctx.state === 'suspended') ctx.resume()

    const masterGain = ctx.createGain()
    masterGain.gain.setValueAtTime(volume, ctx.currentTime)
    masterGain.connect(ctx.destination)
    gainRef.current = masterGain

    let noteIndex = 0
    const beatDuration = 60 / tune.bpm

    const playChord = () => {
      const freqs = tune.freq
      freqs.forEach((freq, i) => {
        const osc  = ctx.createOscillator()
        const gain = ctx.createGain()
        osc.type = tune.type
        osc.frequency.setValueAtTime(freq * (1 + i * 0.002), ctx.currentTime) // slight detune for richness
        gain.gain.setValueAtTime(0, ctx.currentTime)
        gain.gain.linearRampToValueAtTime(0.15, ctx.currentTime + 0.05)
        gain.gain.linearRampToValueAtTime(0.08, ctx.currentTime + beatDuration * 0.6)
        gain.gain.linearRampToValueAtTime(0, ctx.currentTime + beatDuration * 0.95)
        osc.connect(gain)
        gain.connect(masterGain)
        osc.start(ctx.currentTime)
        osc.stop(ctx.currentTime + beatDuration)
        nodesRef.current.push(osc)
      })
      noteIndex++
    }

    playChord()
    intervalRef.current = setInterval(playChord, beatDuration * 1000)
    setCurrent(tune)
    setPlaying(true)
  }

  const toggle = (tune) => {
    if (playing && current?.id === tune.id) { stopAll(); setCurrent(null) }
    else playTune(tune)
  }

  const changeVolume = (v) => {
    setVolume(v)
    if (gainRef.current) gainRef.current.gain.setValueAtTime(v, gainRef.current.context.currentTime)
  }

  const next = () => {
    if (!current) return
    const idx = TUNES.findIndex(t => t.id === current.id)
    playTune(TUNES[(idx + 1) % TUNES.length])
  }

  const prev = () => {
    if (!current) return
    const idx = TUNES.findIndex(t => t.id === current.id)
    playTune(TUNES[(idx - 1 + TUNES.length) % TUNES.length])
  }

  useEffect(() => () => stopAll(), [])

  return { playing, current, volume, toggle, changeVolume, next, prev, stopAll }
}

// ── Local conversational AI (works without backend) ──────────────────────────
const conversationAI = (() => {
  const context = { userName: null, lastTopic: null, turnCount: 0 }

  const patterns = [
    // Greetings
    { match: /\b(hi|hello|hey|good morning|good evening|good afternoon|namaste|vanakkam)\b/i,
      replies: [
        "Hello there! 😊 It's so lovely to hear from you. How are you feeling today?",
        "Hi! I'm so glad you reached out. How has your day been going?",
        "Hello! 🌟 I was just thinking about you. How are you doing right now?",
      ]
    },
    // How are you / feeling
    { match: /\b(how are you|how do you feel|are you okay|you okay)\b/i,
      replies: [
        "I'm doing wonderfully, thank you for asking! 😊 I'm always happy when we get to talk. How about you — how are YOU feeling today?",
        "I'm great! I exist to be here for you, and that makes me happy. More importantly, how are you feeling?",
        "I'm always good when I'm talking with you! 💙 Tell me, how has your day been?",
      ]
    },
    // User feeling good
    { match: /\b(good|great|fine|wonderful|happy|amazing|fantastic|well|better)\b/i,
      replies: [
        "That's so wonderful to hear! 😊 What's been making you feel good today?",
        "I'm really glad to hear that! A happy you makes my day too. Have you done anything fun today?",
        "That's great news! 🌟 Keep that positive energy going. Did you eat well and drink enough water today?",
        "Wonderful! You deserve to feel great. Is there anything special that happened today?",
      ]
    },
    // User feeling bad / sad / lonely
    { match: /\b(sad|lonely|alone|depressed|unhappy|not good|not well|bad|terrible|awful|upset|crying|miss)\b/i,
      replies: [
        "I'm really sorry to hear that. 💙 You're not alone — I'm right here with you. Would you like to talk about what's on your mind?",
        "Oh, I hear you. It's okay to feel that way sometimes. I'm here to listen. What's been bothering you?",
        "I'm so glad you told me. Feeling sad is hard, but sharing it helps. Can you tell me more about what you're going through?",
        "You matter so much, and I care about how you feel. 💙 What happened? I'm all ears.",
      ]
    },
    // Pain / health
    { match: /\b(pain|hurt|ache|headache|chest|breathing|dizzy|fever|sick|ill|unwell|nausea)\b/i,
      replies: [
        "I'm concerned about you. 🏥 Can you describe where the pain is and how long you've had it? I'll alert your caregiver if needed.",
        "That doesn't sound comfortable at all. Is the pain severe? Please let me know so I can notify your caregiver right away.",
        "Your health is the most important thing. On a scale of 1-10, how bad is the pain? And have you taken any medication?",
      ]
    },
    // Medication
    { match: /\b(medicine|medication|tablet|pill|dose|drug|prescription)\b/i,
      replies: [
        "Staying on top of your medications is so important! 💊 Have you taken today's medications? I can set a reminder for you.",
        "Good thinking! It's important not to miss doses. Would you like me to check your medication schedule?",
        "I can help you track your medications. Have you taken all your pills for today?",
      ]
    },
    // Food / eating
    { match: /\b(eat|food|hungry|lunch|dinner|breakfast|meal|drink|water|thirsty)\b/i,
      replies: [
        "Eating well is so important for your health! 🍽️ Have you had a proper meal today? And don't forget to drink water!",
        "Good nutrition keeps you strong and healthy. What did you have to eat today? I hope it was something delicious!",
        "Remember to stay hydrated too! 💧 Drinking 6-8 glasses of water a day is great for your health. Have you been drinking enough?",
      ]
    },
    // Sleep
    { match: /\b(sleep|tired|rest|nap|awake|insomnia|bed|wake)\b/i,
      replies: [
        "Good sleep is so important for your wellbeing! 🌙 How many hours did you sleep last night? Are you feeling rested?",
        "Rest is your body's way of healing. If you're having trouble sleeping, try some deep breathing before bed. Would you like me to play some calming music?",
        "I hope you're getting enough rest. 😴 Aim for 7-8 hours of sleep. Is there anything keeping you awake?",
      ]
    },
    // Family / people
    { match: /\b(family|son|daughter|children|grandchildren|wife|husband|friend|visit|call)\b/i,
      replies: [
        "Family is such a blessing! 👨‍👩‍👧 Have you spoken to them recently? It's always nice to stay connected.",
        "That's lovely! Staying connected with loved ones is so good for your heart and mind. When did you last see them?",
        "How wonderful! Family visits are the best medicine. Is there someone you'd like to call today? I can remind you!",
      ]
    },
    // Weather / outside
    { match: /\b(weather|outside|walk|garden|sun|rain|cold|hot|fresh air)\b/i,
      replies: [
        "A little fresh air and gentle walking is wonderful for your health! 🌤️ Have you been outside today?",
        "Getting some sunlight is great for your mood and vitamin D! Even a short walk in the garden helps. How's the weather where you are?",
        "Nature is so healing! 🌿 If the weather is nice, even 10 minutes outside can lift your spirits. Would you like to try?",
      ]
    },
    // Bored / nothing to do
    { match: /\b(bored|nothing to do|boring|lonely|time|pass time)\b/i,
      replies: [
        "Let's fix that! 😊 We could chat, I could tell you a story, or you could try some light exercises. What sounds good?",
        "I'm here to keep you company! Would you like to play a word game, hear some interesting facts, or just have a good conversation?",
        "How about we do something fun together? I can share a joke, a fun fact, or we can reminisce about good memories. What do you prefer?",
      ]
    },
    // Joke request
    { match: /\b(joke|funny|laugh|humor|make me laugh)\b/i,
      replies: [
        "Here's one! 😄 Why don't scientists trust atoms? Because they make up everything! Did that make you smile?",
        "Okay here goes! 😂 What do you call a fish without eyes? A fsh! Hope that got a chuckle out of you!",
        "Ready? 😄 Why did the scarecrow win an award? Because he was outstanding in his field! How was that?",
      ]
    },
    // Thank you
    { match: /\b(thank you|thanks|thank|grateful|appreciate)\b/i,
      replies: [
        "You're so welcome! 💙 It's my pleasure to be here for you. Is there anything else I can help you with?",
        "Aww, that warms my heart! 😊 I'm always here whenever you need me. Don't hesitate to talk to me anytime.",
        "Of course! That's what I'm here for. 🌟 You deserve all the care and support in the world.",
      ]
    },
    // Goodbye
    { match: /\b(bye|goodbye|see you|take care|goodnight|good night|sleep well)\b/i,
      replies: [
        "Take care of yourself! 💙 Remember to take your medications, drink water, and rest well. I'll be right here whenever you need me. Goodbye! 👋",
        "Goodbye! 🌟 It was so lovely talking with you. Stay safe, eat well, and don't forget — I'm always here for you!",
        "Goodnight! 🌙 Sleep well and sweet dreams. I'll check in with you tomorrow. Take care! 💙",
      ]
    },
    // Name
    { match: /\b(my name is|i am|i'm called|call me)\b/i,
      replies: [
        "What a lovely name! 😊 It's so nice to properly meet you. I'll remember that. How are you feeling today, {name}?",
        "How wonderful! I'll call you that from now on. 🌟 Tell me, how has your day been going?",
      ]
    },
  ]

  const genericFollowUps = [
    "That's really interesting! Tell me more — I'm listening. 😊",
    "I see! And how does that make you feel?",
    "Thank you for sharing that with me. What else is on your mind?",
    "I understand. You know, talking about things always helps. What would you like to chat about next?",
    "I appreciate you telling me that. Is there anything I can do to help you feel better today?",
    "That's good to know! How has the rest of your day been going?",
    "I'm always here to listen. 💙 What else would you like to talk about?",
    "You know, every conversation we have makes me happy. What's something that made you smile recently?",
  ]

  return {
    getReply(text, history) {
      context.turnCount++
      const lower = text.toLowerCase()

      // Extract name if mentioned
      const nameMatch = text.match(/(?:my name is|i am|i'm called|call me)\s+(\w+)/i)
      if (nameMatch) context.userName = nameMatch[1]

      // Find matching pattern
      for (const p of patterns) {
        if (p.match.test(lower)) {
          const reply = p.replies[Math.floor(Math.random() * p.replies.length)]
          context.lastTopic = p.match.source
          return reply.replace('{name}', context.userName || 'friend')
        }
      }

      // Context-aware follow-up based on conversation history
      if (history.length > 2) {
        const lastBotMsg = [...history].reverse().find(m => m.role === 'assistant')
        if (lastBotMsg?.content.includes('?')) {
          // They answered a question — acknowledge and continue
          const acks = [
            `I see! ${genericFollowUps[Math.floor(Math.random() * genericFollowUps.length)]}`,
            `That makes sense. ${genericFollowUps[Math.floor(Math.random() * genericFollowUps.length)]}`,
            `Oh really! ${genericFollowUps[Math.floor(Math.random() * genericFollowUps.length)]}`,
          ]
          return acks[Math.floor(Math.random() * acks.length)]
        }
      }

      return genericFollowUps[Math.floor(Math.random() * genericFollowUps.length)]
    }
  }
})()

export default function VoiceAssistant() {
  const [messages, setMessages] = useState([
    { role: 'assistant', content: 'Hello! I am your ElderCare AI companion. How are you feeling today? 😊', time: new Date() }
  ])
  const [input, setInput]             = useState('')
  const [interimText, setInterimText] = useState('')
  const [listening, setListening]     = useState(false)
  const [loading, setLoading]         = useState(false)
  const [language, setLanguage]       = useState('en')
  const [showPlayer, setShowPlayer]   = useState(true)
  const bottomRef      = useRef(null)
  const recognitionRef = useRef(null)
  const messagesRef    = useRef(messages)
  const music = useMusicPlayer()

  // Keep ref in sync so conversationAI always sees latest history
  useEffect(() => { messagesRef.current = messages }, [messages])
  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages, interimText])

  const sendMessage = async (text) => {
    if (!text.trim()) return
    setInterimText('')
    const userMsg = { role: 'user', content: text, time: new Date() }
    setMessages(prev => [...prev, userMsg])
    setInput('')
    setLoading(true)

    // Simulate thinking delay (300-800ms) for natural feel
    await new Promise(r => setTimeout(r, 300 + Math.random() * 500))

    try {
      // Try backend first
      const res = await api.post('/chat', { message: text, language })
      const botMsg = { role: 'assistant', content: res.data.reply, sentiment: res.data.sentiment, time: new Date() }
      setMessages(prev => [...prev, botMsg])
      speak(res.data.reply)
    } catch {
      // Backend offline — use local AI with full conversation context
      const reply = conversationAI.getReply(text, messagesRef.current)
      const botMsg = { role: 'assistant', content: reply, time: new Date() }
      setMessages(prev => [...prev, botMsg])
      speak(reply)
    } finally {
      setLoading(false)
    }
  }

  const speak = (text) => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel()
      const utt = new SpeechSynthesisUtterance(text)
      utt.lang = language === 'hi' ? 'hi-IN' : language === 'te' ? 'te-IN' : 'en-US'
      utt.rate = 0.9
      window.speechSynthesis.speak(utt)
    }
  }

  const startListening = () => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition
    if (!SR) {
      alert('Speech recognition is not supported in this browser. Please use Chrome.')
      return
    }
    const recognition = new SR()
    recognition.lang = language === 'hi' ? 'hi-IN' : language === 'te' ? 'te-IN' : 'en-US'
    recognition.interimResults = true   // show live text as you speak
    recognition.continuous = false

    recognition.onstart = () => setListening(true)

    recognition.onresult = (e) => {
      let interim = ''
      let final = ''
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const t = e.results[i][0].transcript
        if (e.results[i].isFinal) final += t
        else interim += t
      }
      // Show live interim text in the input box
      if (interim) setInterimText(interim)
      if (final) {
        setInterimText('')
        setInput(final)
        sendMessage(final)
      }
    }

    recognition.onend = () => {
      setListening(false)
      setInterimText('')
    }
    recognition.onerror = (e) => {
      console.error('Speech error:', e.error)
      setListening(false)
      setInterimText('')
    }

    recognitionRef.current = recognition
    recognition.start()
  }

  const stopListening = () => {
    recognitionRef.current?.stop()
    setListening(false)
    setInterimText('')
  }

  const sentimentColor = (s) => s > 0.3 ? '#10b981' : s < -0.3 ? '#ef4444' : '#94a3b8'

  return (
    <div className="voice-page fade-in">
      <div className="page-header">
        <div>
          <h1>Voice Assistant</h1>
          <p className="subtitle">Talk naturally — I'm always here</p>
        </div>
        <div className="header-controls">
          <div className="lang-selector">
            <Globe size={16} />
            <select value={language} onChange={e => setLanguage(e.target.value)}>
              {Object.entries(LANGS).map(([k,v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          </div>
          <button className="btn btn-ghost icon-btn" onClick={() => setShowPlayer(p => !p)} title="Toggle music player">
            <Music size={18} />
            <span style={{fontSize:13}}>{showPlayer ? 'Hide Music' : 'Show Music'}</span>
          </button>
        </div>
      </div>

      {/* Listening indicator banner */}
      {listening && (
        <div className="listening-banner">
          <span className="mic-pulse" />
          <span>Listening... speak now</span>
          {interimText && <span className="interim-preview">"{interimText}"</span>}
        </div>
      )}

      <div className="voice-layout">
        {/* Chat panel */}
        <div className="chat-container card">
          <div className="chat-messages">
            {messages.map((m, i) => (
              <div key={i} className={`message ${m.role}`}>
                <div className="msg-avatar">{m.role === 'assistant' ? '🤖' : '👤'}</div>
                <div className="msg-content">
                  <div className="msg-bubble">
                    {m.content}
                    {m.sentiment !== undefined && (
                      <div className="sentiment-dot" style={{ background: sentimentColor(m.sentiment) }} title={`Sentiment: ${m.sentiment?.toFixed(2)}`} />
                    )}
                  </div>
                  <div className="msg-time">{m.time?.toLocaleTimeString([], {hour:'2-digit',minute:'2-digit'})}</div>
                </div>
              </div>
            ))}

            {interimText && (
              <div className="message user">
                <div className="msg-avatar">👤</div>
                <div className="msg-content">
                  <div className="msg-bubble interim-bubble">
                    <span className="interim-text">{interimText}</span>
                    <span className="interim-cursor">|</span>
                  </div>
                </div>
              </div>
            )}

            {loading && (
              <div className="message assistant">
                <div className="msg-avatar">🤖</div>
                <div className="msg-content">
                  <div className="msg-bubble typing"><span/><span/><span/></div>
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          <div className="chat-input-area">
            <input
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && sendMessage(input)}
              placeholder={listening ? 'Listening...' : `Type a message in ${LANGS[language]}...`}
              readOnly={listening}
            />
            <button className="btn btn-ghost icon-btn" onClick={() => speak(messages[messages.length-1]?.content)} title="Replay last message">
              <Volume2 size={20} />
            </button>
            <button
              className={`btn mic-btn ${listening ? 'btn-danger listening' : 'btn-primary'}`}
              onClick={listening ? stopListening : startListening}
              title={listening ? 'Stop listening' : 'Start voice input'}
            >
              {listening ? <MicOff size={20} /> : <Mic size={20} />}
              <span className="mic-label">{listening ? 'Stop' : 'Speak'}</span>
            </button>
            <button className="btn btn-primary send-btn" onClick={() => sendMessage(input)} disabled={!input.trim() || loading}>
              <Send size={18} />
            </button>
          </div>
        </div>

        {/* Music Player panel */}
        {showPlayer && (
          <div className="music-panel">
            <div className="card music-header-card">
              <div className="music-title"><Music size={18} color="var(--accent-purple)"/> Calming Tunes</div>
              <div className="music-subtitle">Choose a tune to relax</div>

              {/* Now playing */}
              {music.current && (
                <div className="now-playing" style={{ borderColor: music.current.color }}>
                  <div className="np-emoji">{music.current.emoji}</div>
                  <div className="np-info">
                    <div className="np-name">{music.current.name}</div>
                    <div className="np-desc">{music.current.desc}</div>
                  </div>
                  <div className="np-wave">
                    <span style={{background: music.current.color}}/>
                    <span style={{background: music.current.color}}/>
                    <span style={{background: music.current.color}}/>
                    <span style={{background: music.current.color}}/>
                  </div>
                </div>
              )}

              {/* Controls */}
              <div className="music-controls">
                <button className="btn btn-ghost ctrl-btn" onClick={music.prev} disabled={!music.current}><SkipBack size={18}/></button>
                <button className="btn ctrl-btn play-pause" onClick={() => music.current ? music.stopAll() : music.toggle(TUNES[0])}
                  style={{ background: music.playing ? 'var(--accent-red)' : 'var(--accent)' }}>
                  {music.playing ? <Pause size={20}/> : <Play size={20}/>}
                </button>
                <button className="btn btn-ghost ctrl-btn" onClick={music.next} disabled={!music.current}><SkipForward size={18}/></button>
              </div>

              {/* Volume */}
              <div className="volume-row">
                {music.volume === 0 ? <VolumeX size={16} color="var(--text-muted)"/> : <Volume1 size={16} color="var(--text-muted)"/>}
                <input type="range" min="0" max="1" step="0.05" value={music.volume}
                  onChange={e => music.changeVolume(parseFloat(e.target.value))}
                  className="volume-slider" />
                <span className="vol-pct">{Math.round(music.volume * 100)}%</span>
              </div>
            </div>

            {/* Tune grid */}
            <div className="tunes-grid">
              {TUNES.map(tune => (
                <button
                  key={tune.id}
                  className={`tune-card ${music.current?.id === tune.id && music.playing ? 'active' : ''}`}
                  style={{ '--tune-color': tune.color }}
                  onClick={() => music.toggle(tune)}
                >
                  <div className="tune-emoji">{tune.emoji}</div>
                  <div className="tune-name">{tune.name}</div>
                  <div className="tune-desc">{tune.desc}</div>
                  {music.current?.id === tune.id && music.playing && (
                    <div className="tune-playing-dot" style={{ background: tune.color }}/>
                  )}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
