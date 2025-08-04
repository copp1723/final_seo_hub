'use client'

import { useState } from 'react'

export default function TestInputPage() {
  const [value, setValue] = useState('')

  return (
    <div style={{ padding: '20px', backgroundColor: 'white' }}>
      <h1 style={{ color: 'red', fontSize: '24px', marginBottom: '20px' }}>
        🔧 INPUT TEST PAGE
      </h1>
      
      <div style={{ marginBottom: '20px', padding: '10px', backgroundColor: '#f0f0f0' }}>
        <p><strong>Current value:</strong> "{value}"</p>
        <p><strong>Value length:</strong> {value.length}</p>
      </div>

      <div style={{ marginBottom: '20px' }}>
        <label style={{ display: 'block', marginBottom: '5px' }}>
          Basic HTML Input:
        </label>
        <input
          type="text"
          value={value}
          onChange={(e) => {
            console.log('Input changed:', e.target.value)
            setValue(e.target.value)
          }}
          placeholder="Type here to test basic input..."
          style={{
            width: '100%',
            padding: '10px',
            border: '2px solid #333',
            fontSize: '16px'
          }}
        />
      </div>

      <div style={{ marginBottom: '20px' }}>
        <button
          onClick={() => {
            console.log('Button clicked!')
            alert('Button works! Current value: ' + value)
          }}
          style={{
            padding: '10px 20px',
            backgroundColor: '#007bff',
            color: 'white',
            border: 'none',
            cursor: 'pointer',
            fontSize: '16px'
          }}
        >
          Test Button
        </button>
      </div>

      <div style={{ marginBottom: '20px' }}>
        <button
          onClick={() => setValue('')}
          style={{
            padding: '10px 20px',
            backgroundColor: '#dc3545',
            color: 'white',
            border: 'none',
            cursor: 'pointer',
            fontSize: '16px'
          }}
        >
          Clear Input
        </button>
      </div>

      <div style={{ padding: '10px', backgroundColor: '#d4edda', border: '1px solid #c3e6cb' }}>
        <p><strong>Instructions:</strong></p>
        <ol>
          <li>Try typing in the input field above</li>
          <li>Click the "Test Button"</li>
          <li>Check the browser console for logs</li>
          <li>If this works, the issue is with the chat component specifically</li>
          <li>If this doesn't work, there's a broader JavaScript/React issue</li>
        </ol>
      </div>
    </div>
  )
}
