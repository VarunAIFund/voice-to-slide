import { useEffect, useState } from 'react'
import axios from 'axios'
import { Download, Loader2, Sparkles, UploadCloud } from 'lucide-react'
import { Button } from './components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './components/ui/card'
import { Input } from './components/ui/input'
import { Label } from './components/ui/label'
import { Select } from './components/ui/select'
import { Switch } from './components/ui/switch'
import { Textarea } from './components/ui/textarea'

const API_CANDIDATES = [
  import.meta.env.VITE_API_BASE_URL,
  'http://localhost:8000',
  'http://127.0.0.1:8000',
  'http://localhost:8001',
  'http://127.0.0.1:8001',
].filter(Boolean)
const VISUAL_STYLES = ['cinematic', 'minimalist', 'futuristic', 'editorial', 'photoreal']

function App() {
  const [apiBaseUrl, setApiBaseUrl] = useState(API_CANDIDATES[0] || '')
  const [themes, setThemes] = useState({})
  const [selectedTheme, setSelectedTheme] = useState('corporate_blue')
  const [visualStyle, setVisualStyle] = useState('cinematic')
  const [includeImages, setIncludeImages] = useState(true)
  const [textInput, setTextInput] = useState('')
  const [audioFile, setAudioFile] = useState(null)
  const [transcript, setTranscript] = useState('')
  const [slideContent, setSlideContent] = useState(null)
  const [jobId, setJobId] = useState('')
  const [isGenerating, setIsGenerating] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    const loadThemes = async () => {
      for (const baseUrl of API_CANDIDATES) {
        try {
          const response = await axios.get(`${baseUrl}/themes`, { timeout: 2500 })
          setThemes(response.data.themes || {})
          setApiBaseUrl(baseUrl)
          setError('')
          return
        } catch (err) {
          // Try next candidate URL
        }
      }
      setError(`Failed to load themes. Start backend and check API URL (tried: ${API_CANDIDATES.join(', ')})`)
    }
    loadThemes()
  }, [])

  const handleGenerate = async () => {
    if (!textInput.trim() && !audioFile) {
      setError('Add text or upload an audio file')
      return
    }

    setError('')
    setIsGenerating(true)
    setSlideContent(null)
    setTranscript('')
    setJobId('')

    try {
      const formData = new FormData()
      formData.append('transcript', textInput)
      formData.append('theme', selectedTheme)
      formData.append('include_images', String(includeImages))
      formData.append('visual_style', visualStyle)
      if (audioFile) formData.append('audio', audioFile)

      const response = await axios.post(`${apiBaseUrl}/generate-from-input`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })

      setSlideContent(response.data.slide_content)
      setTranscript(response.data.transcript || '')
      setJobId(response.data.job_id || '')
    } catch (err) {
      setError(err.response?.data?.detail || `Generation failed: ${err.message}`)
    } finally {
      setIsGenerating(false)
    }
  }

  const handleDownload = async () => {
    if (!jobId) return
    try {
      const response = await axios.get(`${apiBaseUrl}/download/${jobId}`, { responseType: 'blob' })
      const url = window.URL.createObjectURL(new Blob([response.data]))
      const link = document.createElement('a')
      link.href = url
      link.setAttribute('download', 'presentation.pptx')
      document.body.appendChild(link)
      link.click()
      link.remove()
      window.URL.revokeObjectURL(url)
    } catch (err) {
      setError('Download failed')
    }
  }

  return (
    <main className="min-h-screen bg-slate-950 px-4 py-6 text-slate-100 md:px-8">
      <div className="mx-auto grid w-full max-w-7xl grid-cols-1 gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>AI Slide Builder</CardTitle>
            <CardDescription>Paste text or upload audio, then generate slides instantly.</CardDescription>
            <p className="text-xs text-slate-500">API: {apiBaseUrl || 'not connected'}</p>
          </CardHeader>
          <CardContent className="space-y-5">
            <div>
              <Label className="mb-2 block">Text Input</Label>
              <Textarea
                value={textInput}
                onChange={(e) => setTextInput(e.target.value)}
                placeholder="Paste your script, meeting notes, or outline..."
                className="min-h-[160px]"
              />
            </div>

            <div>
              <Label className="mb-2 block">Audio Upload</Label>
              <label className="flex h-10 cursor-pointer items-center gap-3 rounded-xl border border-dashed border-slate-700 bg-slate-950 px-3 text-sm text-slate-300 hover:border-cyan-400/70">
                <UploadCloud className="h-4 w-4" />
                <span>{audioFile ? audioFile.name : 'Choose audio file (mp3, wav, m4a, etc.)'}</span>
                <Input
                  type="file"
                  accept="audio/*,.m4a,.wav,.mp3,.ogg,.flac,.aac"
                  className="hidden"
                  onChange={(e) => setAudioFile(e.target.files?.[0] || null)}
                />
              </label>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <Label className="mb-2 block">Theme</Label>
                <Select
                  value={selectedTheme}
                  onChange={(e) => setSelectedTheme(e.target.value)}
                >
                  {Object.entries(themes).map(([id, theme]) => (
                    <option key={id} value={id}>
                      {theme.name}
                    </option>
                  ))}
                </Select>
              </div>
              <div>
                <Label className="mb-2 block">Visual Style</Label>
                <Select
                  value={visualStyle}
                  onChange={(e) => setVisualStyle(e.target.value)}
                >
                  {VISUAL_STYLES.map((style) => (
                    <option key={style} value={style}>
                      {style}
                    </option>
                  ))}
                </Select>
              </div>
            </div>

            <label className="flex items-center justify-between rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm">
              <span>Generate AI images per slide</span>
              <Switch checked={includeImages} onClick={() => setIncludeImages((prev) => !prev)} />
            </label>

            {error && <p className="rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-200">{error}</p>}

            <div className="flex flex-wrap gap-3">
              <Button
                onClick={handleGenerate}
                disabled={isGenerating}
              >
                {isGenerating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                {isGenerating ? 'Generating...' : 'Generate Slides'}
              </Button>

              <Button
                onClick={handleDownload}
                disabled={!jobId}
                variant="secondary"
              >
                <Download className="h-4 w-4" />
                Download PPTX
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Preview</CardTitle>
            <CardDescription>Generated slides appear here on the right.</CardDescription>
          </CardHeader>
          <CardContent>

          {!slideContent && (
            <div className="rounded-xl border border-dashed border-slate-700 bg-slate-950/60 p-8 text-sm text-slate-500">
              No slides yet. Enter text or upload audio, then click Generate Slides.
            </div>
          )}

          {slideContent && (
            <div className="space-y-4">
              <div className="rounded-xl border border-cyan-500/30 bg-cyan-500/10 p-4">
                <p className="text-xs uppercase tracking-wide text-cyan-200">Presentation Title</p>
                <h3 className="text-lg font-semibold text-cyan-50">{slideContent.title}</h3>
              </div>

              {slideContent.slides?.map((slide, index) => (
                <article key={index} className="rounded-xl border border-slate-700 bg-slate-950 p-4">
                  <p className="mb-2 text-xs uppercase tracking-wide text-slate-500">Slide {index + 1}</p>
                  <h4 className="mb-2 text-base font-semibold">{slide.title}</h4>
                  <ul className="space-y-1 text-sm text-slate-300">
                    {slide.content?.map((point, pointIndex) => (
                      <li key={pointIndex}>- {point}</li>
                    ))}
                  </ul>
                  {slide.visual_prompt && (
                    <p className="mt-3 rounded-md border border-slate-700 bg-slate-900 p-2 text-xs text-slate-400">
                      Visual prompt: {slide.visual_prompt}
                    </p>
                  )}
                </article>
              ))}

              {transcript && (
                <div className="max-h-48 overflow-y-auto rounded-xl border border-slate-700 bg-slate-950 p-4 text-xs text-slate-400">
                  <p className="mb-2 font-medium text-slate-300">Transcript used</p>
                  <p className="whitespace-pre-wrap">{transcript}</p>
                </div>
              )}
            </div>
          )}
          </CardContent>
        </Card>
      </div>
    </main>
  )
}

export default App