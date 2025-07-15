import React from 'react'

interface MarkdownRendererProps {
  content: string
  className?: string
}

export function MarkdownRenderer({ content, className = '' }: MarkdownRendererProps) {
  // Simple markdown parser for chat responses
  const parseMarkdown = (text: string): React.ReactNode => {
    const lines = text.split('\n')
    const elements: React.ReactNode[] = []
    let currentList: string[] = []
    let listType: 'ul' | 'ol' | null = null
    let inCodeBlock = false
    let codeBlockContent: string[] = []
    
    const flushList = () => {
      if (currentList.length > 0 && listType) {
        const ListComponent = listType === 'ul' ? 'ul' : 'ol'
        elements.push(
          <ListComponent key={elements.length} className={listType === 'ul' ? 'list-disc pl-5 space-y-1' : 'list-decimal pl-5 space-y-1'}>
            {currentList.map((item, idx) => (
              <li key={idx} className="text-sm">{parseInlineMarkdown(item)}</li>
            ))}
          </ListComponent>
        )
        currentList = []
        listType = null
      }
    }
    
    const flushCodeBlock = () => {
      if (codeBlockContent.length > 0) {
        // For JSON or technical content, render as a simple formatted note
        const content = codeBlockContent.join('\n')
        if (content.includes('"@type"') || content.includes('json')) {
          elements.push(
            <div key={elements.length} className="bg-blue-50 border border-blue-200 rounded p-3 my-2">
              <p className="text-xs font-medium text-blue-900 mb-1">Technical Implementation Details</p>
              <p className="text-xs text-blue-700">Schema markup configuration available - ask for specific implementation guidance</p>
            </div>
          )
        } else {
          // For non-JSON code, show as preformatted text
          elements.push(
            <pre key={elements.length} className="bg-gray-100 rounded p-3 text-xs overflow-x-auto my-2">
              {content}
            </pre>
          )
        }
        codeBlockContent = []
      }
    }
    
    lines.forEach((line, index) => {
      // Skip empty lines at the start
      if (index === 0 && line.trim() === '') return
      
      // Code blocks
      if (line.trim().startsWith('```')) {
        if (inCodeBlock) {
          flushCodeBlock()
          inCodeBlock = false
        } else {
          flushList()
          inCodeBlock = true
        }
        return
      }
      
      if (inCodeBlock) {
        codeBlockContent.push(line)
        return
      }
      
      // Headers
      if (line.startsWith('### ')) {
        flushList()
        elements.push(
          <h3 key={elements.length} className="font-semibold text-base mt-4 mb-2">
            {parseInlineMarkdown(line.substring(4))}
          </h3>
        )
      } else if (line.startsWith('## ')) {
        flushList()
        elements.push(
          <h2 key={elements.length} className="font-bold text-lg mt-4 mb-2">
            {parseInlineMarkdown(line.substring(3))}
          </h2>
        )
      } else if (line.startsWith('# ')) {
        flushList()
        elements.push(
          <h1 key={elements.length} className="font-bold text-xl mt-4 mb-2">
            {parseInlineMarkdown(line.substring(2))}
          </h1>
        )
      }
      // Bullet lists
      else if (line.trim().startsWith('- ') || line.trim().startsWith('• ') || line.trim().startsWith('* ')) {
        if (listType !== 'ul') {
          flushList()
          listType = 'ul'
        }
        currentList.push(line.trim().substring(2))
      }
      // Numbered lists
      else if (/^\d+\.\s/.test(line.trim())) {
        if (listType !== 'ol') {
          flushList()
          listType = 'ol'
        }
        currentList.push(line.trim().replace(/^\d+\.\s/, ''))
      }
      // Normal paragraphs
      else {
        flushList()
        if (line.trim()) {
          elements.push(
            <p key={elements.length} className="text-sm mb-2">
              {parseInlineMarkdown(line)}
            </p>
          )
        } else if (elements.length > 0) {
          // Add spacing between paragraphs
          elements.push(<div key={elements.length} className="h-2" />)
        }
      }
    })
    
    flushList()
    flushCodeBlock()
    return elements
  }
  
  const parseInlineMarkdown = (text: string): React.ReactNode => {
    // Remove excessive asterisks and clean up formatting
    text = text.replace(/\*{3}/g, '**') // Convert *** to **
    
    const parts: React.ReactNode[] = []
    let currentIndex = 0
    
    // Bold text
    const boldRegex = /\*\*([^*]+)\*\*/g
    let match
    
    while ((match = boldRegex.exec(text)) !== null) {
      if (match.index > currentIndex) {
        parts.push(text.substring(currentIndex, match.index))
      }
      parts.push(
        <strong key={`bold-${match.index}`} className="font-semibold">
          {match[1]}
        </strong>
      )
      currentIndex = match.index + match[0].length
    }
    
    if (currentIndex < text.length) {
      parts.push(text.substring(currentIndex))
    }
    
    return parts.length > 0 ? parts : text
  }
  
  return (
    <div className={`prose prose-sm max-w-none ${className}`}>
      {parseMarkdown(content)}
    </div>
  )
}
