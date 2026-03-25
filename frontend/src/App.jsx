import { useState, useCallback, useEffect } from 'react'
import { useDropzone } from 'react-dropzone'
import axios from 'axios'

const API_BASE_URL = 'http://localhost:8000'

function App() {
  const [jobId, setJobId] = useState(null)
  const [status, setStatus] = useState('idle')
  const [progress, setProgress] = useState(0)
  const [transcript, setTranscript] = useState('')
  const [slideContent, setSlideContent] = useState(null)
  const [error, setError] = useState('')
  const [uploading, setUploading] = useState(false)
  const [themes, setThemes] = useState({})
  const [selectedTheme, setSelectedTheme] = useState('corporate_blue')

  // Load themes on component mount
  useEffect(() => {
    const loadThemes = async () => {
      try {
        const response = await axios.get(`${API_BASE_URL}/themes`)
        setThemes(response.data.themes)
      } catch (err) {
        console.error('Failed to load themes:', err)
      }
    }
    loadThemes()
  }, [])

  const onDrop = useCallback(async (acceptedFiles) => {
    const file = acceptedFiles[0]
    if (!file) return

    if (!file.name.endsWith('.mp4')) {
      setError('Please upload an MP4 file')
      return
    }

    setUploading(true)
    setError('')
    setJobId(null)
    setStatus('uploading')
    setProgress(0)

    try {
      const formData = new FormData()
      formData.append('file', file)

      const response = await axios.post(`${API_BASE_URL}/upload`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      })

      setJobId(response.data.job_id)
      setStatus('uploaded')
      setProgress(10)
      console.log('File uploaded successfully:', response.data)
    } catch (err) {
      setError('Failed to upload file: ' + err.message)
      console.error('Upload error:', err)
    } finally {
      setUploading(false)
    }
  }, [])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'video/mp4': ['.mp4']
    },
    multiple: false
  })

  const pollStatus = async () => {
    if (!jobId) return

    try {
      const response = await axios.get(`${API_BASE_URL}/status/${jobId}`)
      const jobStatus = response.data
      
      setStatus(jobStatus.status)
      setProgress(jobStatus.progress || 0)
      
      if (jobStatus.status === 'error') {
        setError(jobStatus.error)
      }
      
      console.log('Job status:', jobStatus)
    } catch (err) {
      setError('Failed to check status: ' + err.message)
      console.error('Status error:', err)
    }
  }

  const getTranscript = async () => {
    if (!jobId) return

    try {
      const response = await axios.get(`${API_BASE_URL}/transcript/${jobId}`)
      
      if (response.data.transcript) {
        setTranscript(response.data.transcript)
        setStatus('transcript_ready')
        setProgress(60)
      }
      
      console.log('Transcript:', response.data)
    } catch (err) {
      setError('Failed to get transcript: ' + err.message)
      console.error('Transcript error:', err)
    }
  }

  const generateSlides = async () => {
    if (!jobId) return

    try {
      const response = await axios.post(`${API_BASE_URL}/generate-slides/${jobId}?theme=${selectedTheme}`)
      
      setSlideContent(response.data.slide_content)
      setStatus('completed')
      setProgress(100)
      
      console.log('Slides generated:', response.data)
    } catch (err) {
      setError('Failed to generate slides: ' + err.message)
      console.error('Slides error:', err)
    }
  }

  const downloadPresentation = async () => {
    if (!jobId) return

    try {
      const response = await axios.get(`${API_BASE_URL}/download/${jobId}`, {
        responseType: 'blob',
      })

      const url = window.URL.createObjectURL(new Blob([response.data]))
      const link = document.createElement('a')
      link.href = url
      link.setAttribute('download', 'presentation.pptx')
      document.body.appendChild(link)
      link.click()
      link.remove()
      window.URL.revokeObjectURL(url)
      
      console.log('Download initiated')
    } catch (err) {
      setError('Failed to download presentation: ' + err.message)
      console.error('Download error:', err)
    }
  }

  const resetApp = () => {
    setJobId(null)
    setStatus('idle')
    setProgress(0)
    setTranscript('')
    setSlideContent(null)
    setError('')
    setUploading(false)
  }

  return (
    <div className="min-h-screen bg-gray-100 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">
            Voice-to-Slide Generator
          </h1>
          <p className="text-lg text-gray-600">
            Upload an MP4 video to generate PowerPoint slides from audio
          </p>
        </div>

        {/* Error Display */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
            <div className="flex">
              <div className="text-red-700">{error}</div>
              <button
                onClick={() => setError('')}
                className="ml-auto text-red-500 hover:text-red-700"
              >
                ✕
              </button>
            </div>
          </div>
        )}

        {/* Upload Area */}
        {status === 'idle' && (
          <div className="mb-8">
            <div
              {...getRootProps()}
              className={`border-2 border-dashed rounded-lg p-12 text-center cursor-pointer transition-colors ${
                isDragActive
                  ? 'border-blue-400 bg-blue-50'
                  : 'border-gray-300 hover:border-gray-400'
              }`}
            >
              <input {...getInputProps()} />
              <div className="text-gray-500 text-lg">
                {isDragActive ? (
                  <p>Drop the MP4 file here...</p>
                ) : (
                  <div>
                    <p className="mb-2">Drag & drop an MP4 file here</p>
                    <p className="text-sm">or click to select</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Progress Bar */}
        {(status !== 'idle' && status !== 'completed') && (
          <div className="mb-8">
            <div className="flex justify-between text-sm text-gray-600 mb-2">
              <span>Progress</span>
              <span>{progress}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                style={{ width: `${progress}%` }}
              ></div>
            </div>
            <p className="text-sm text-gray-600 mt-2 capitalize">
              {status.replace(/_/g, ' ')}
              {uploading && '...'}
            </p>
          </div>
        )}

        {/* Theme Selection */}
        {status === 'transcript_ready' && Object.keys(themes).length > 0 && (
          <div className="mb-8 p-6 bg-white rounded-lg shadow">
            <h3 className="text-lg font-semibold mb-4">Choose Presentation Theme</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {Object.entries(themes).map(([themeId, theme]) => (
                <div
                  key={themeId}
                  onClick={() => setSelectedTheme(themeId)}
                  className={`p-3 rounded-lg border-2 cursor-pointer transition-all hover:shadow-md ${
                    selectedTheme === themeId 
                      ? 'border-blue-500 bg-blue-50' 
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="mb-2">
                    <div className="flex space-x-1 mb-1">
                      <div 
                        className="w-4 h-4 rounded-full" 
                        style={{ backgroundColor: theme.colors.primary }}
                      ></div>
                      <div 
                        className="w-4 h-4 rounded-full" 
                        style={{ backgroundColor: theme.colors.secondary }}
                      ></div>
                      <div 
                        className="w-4 h-4 rounded-full" 
                        style={{ backgroundColor: theme.colors.accent }}
                      ></div>
                    </div>
                    <div 
                      className="w-full h-2 rounded" 
                      style={{ backgroundColor: theme.colors.background }}
                    ></div>
                  </div>
                  <p className="text-sm font-medium text-gray-700">{theme.name}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex gap-4 mb-8 justify-center">
          {jobId && status === 'uploaded' && (
            <button
              onClick={getTranscript}
              disabled={uploading}
              className="px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50"
            >
              Process Audio
            </button>
          )}

          {status === 'transcript_ready' && (
            <button
              onClick={generateSlides}
              className="px-6 py-3 bg-green-500 text-white rounded-lg hover:bg-green-600"
            >
              Generate Slides
            </button>
          )}

          {status === 'completed' && (
            <button
              onClick={downloadPresentation}
              className="px-6 py-3 bg-purple-500 text-white rounded-lg hover:bg-purple-600"
            >
              Download PowerPoint
            </button>
          )}

          {(status === 'uploaded' || status === 'transcript_ready' || status === 'completed') && (
            <button
              onClick={pollStatus}
              className="px-6 py-3 bg-gray-500 text-white rounded-lg hover:bg-gray-600"
            >
              Refresh Status
            </button>
          )}

          {status !== 'idle' && (
            <button
              onClick={resetApp}
              className="px-6 py-3 bg-red-500 text-white rounded-lg hover:bg-red-600"
            >
              Start Over
            </button>
          )}
        </div>

        {/* Transcript Display */}
        {transcript && (
          <div className="mb-8 p-6 bg-white rounded-lg shadow">
            <h3 className="text-lg font-semibold mb-4">Transcript</h3>
            <div className="text-gray-700 whitespace-pre-wrap max-h-64 overflow-y-auto">
              {transcript}
            </div>
          </div>
        )}

        {/* Slide Content Preview */}
        {slideContent && (
          <div className="mb-8 p-6 bg-white rounded-lg shadow">
            <h3 className="text-lg font-semibold mb-4">Generated Slides</h3>
            <div className="space-y-4">
              <div className="p-4 bg-gray-50 rounded">
                <h4 className="font-semibold text-lg">{slideContent.title}</h4>
              </div>
              {slideContent.slides.map((slide, index) => (
                <div key={index} className="p-4 bg-gray-50 rounded">
                  <h4 className="font-semibold mb-2">{slide.title}</h4>
                  <ul className="list-disc list-inside space-y-1">
                    {slide.content.map((point, pointIndex) => (
                      <li key={pointIndex} className="text-gray-700">{point}</li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default App