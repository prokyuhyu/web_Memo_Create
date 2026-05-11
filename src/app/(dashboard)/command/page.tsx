'use client'

import { useEffect, useRef, useState } from 'react'

type CommandEntry = {
  id: string
  command: string
  output: string
}

export default function CommandPage() {
  const [input, setInput] = useState('')
  const [entries, setEntries] = useState<CommandEntry[]>([])
  const inputRef = useRef<HTMLInputElement>(null)
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [entries])

  function runCommand() {
    const raw = input
    const command = raw.trim()

    if (!command) return

    if (command === '/clear') {
      setEntries([])
      setInput('')
      return
    }

    let output = ''

    if (command === 'echo') {
      output = 'Usage: echo <text>'
    } else if (command.startsWith('echo ')) {
      output = raw.slice(raw.indexOf('echo') + 5)
    } else {
      output = `Unknown command: ${command}`
    }

    setEntries((prev) => [
      ...prev,
      {
        id: `${Date.now()}-${Math.random()}`,
        command: raw,
        output,
      },
    ])

    setInput('')
  }

  return (
    <div className="max-w-4xl mx-auto h-[calc(100vh-3rem)] flex flex-col">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-[#e6edf3]">Command</h1>
        <p className="text-[#8b949e] text-sm mt-1">
          Simple local command console. Try <span className="text-[#e6edf3]">echo 안녕하세요</span> or{' '}
          <span className="text-[#e6edf3]">/clear</span>.
        </p>
      </div>

      <div className="flex-1 min-h-0 bg-[#161b22] border border-[#30363d] rounded-2xl overflow-hidden shadow-2xl flex flex-col">
        <div className="flex items-center gap-2 px-4 py-3 border-b border-[#30363d] bg-[#0d1117] shrink-0">
          <span className="w-3 h-3 rounded-full bg-[#da3633]" />
          <span className="w-3 h-3 rounded-full bg-[#f59e0b]" />
          <span className="w-3 h-3 rounded-full bg-[#238636]" />
          <span className="text-[#8b949e] text-xs ml-2">local command</span>
        </div>

        <div
          className="flex-1 overflow-y-auto p-4 font-mono text-sm"
          onClick={() => inputRef.current?.focus()}
        >
          {entries.length === 0 ? (
            <div className="text-[#484f58]">
              No commands yet.
            </div>
          ) : (
            <div className="space-y-4">
              {entries.map((entry) => (
                <div key={entry.id}>
                  <div className="text-[#7c3aed]">
                    <span className="text-[#8b949e]">&gt;</span> {entry.command}
                  </div>
                  {entry.output && (
                    <pre className="text-[#e6edf3] whitespace-pre-wrap break-words mt-1">
                      {entry.output}
                    </pre>
                  )}
                </div>
              ))}
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        <div className="border-t border-[#30363d] bg-[#0d1117] p-3 flex items-center gap-2 shrink-0 font-mono">
          <span className="text-[#7c3aed]">&gt;</span>
          <input
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault()
                runCommand()
              }
            }}
            placeholder="Type a command..."
            className="flex-1 bg-transparent text-[#e6edf3] placeholder-[#484f58] outline-none text-sm"
          />
        </div>
      </div>
    </div>
  )
}
