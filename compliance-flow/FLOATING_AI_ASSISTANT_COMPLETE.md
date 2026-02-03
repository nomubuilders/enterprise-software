# Complete Implementation Guide - Floating AI Assistant

## Summary for Pookie 💖

The AI Assistant Panel now has smart intent detection but still needs to be converted to a floating window. Here's the complete implementation:

## Changes Needed in AIAssistantPanel.tsx

### 1. Add Drag/Resize Handlers (After handleClearCanvas, before if (!isOpen))

```typescript
// Drag and resize handlers
const handleMouseDown = (e: React.MouseEvent) => {
  const target = e.target as HTMLElement
  const handle = target.getAttribute('data-resize-handle') as ResizeHandle

  if (handle) {
    isResizing.current = true
    resizeHandle.current = handle
    dragStart.current = {
      x: e.clientX,
      y: e.clientY,
      width: size.width,
      height: size.height,
    }
    e.preventDefault()
    e.stopPropagation()
    document.addEventListener('mousemove', handleMouseMove)
    document.addEventListener('mouseup', handleMouseUp)
    return
  }

  if (target.closest('.drag-handle')) {
    isDragging.current = true
    dragStart.current = {
      x: e.clientX - position.x,
      y: e.clientY - position.y,
      width: size.width,
      height: size.height,
    }
    document.addEventListener('mousemove', handleMouseMove)
    document.addEventListener('mouseup', handleMouseUp)
  }
}

const handleMouseMove = (e: MouseEvent) => {
  if (isResizing.current && resizeHandle.current) {
    const deltaX = e.clientX - dragStart.current.x
    const deltaY = e.clientY - dragStart.current.y

    let newWidth = size.width
    let newHeight = size.height
    let newX = position.x
    let newY = position.y

    const minWidth = 320
    const minHeight = 400

    if (resizeHandle.current.includes('e')) {
      newWidth = Math.max(minWidth, dragStart.current.width + deltaX)
    }
    if (resizeHandle.current.includes('w')) {
      const tentativeWidth = dragStart.current.width - deltaX
      if (tentativeWidth >= minWidth) {
        newWidth = tentativeWidth
        newX = position.x + deltaX
      }
    }
    if (resizeHandle.current.includes('s')) {
      newHeight = Math.max(minHeight, dragStart.current.height + deltaY)
    }
    if (resizeHandle.current.includes('n')) {
      const tentativeHeight = dragStart.current.height - deltaY
      if (tentativeHeight >= minHeight) {
        newHeight = tentativeHeight
        newY = position.y + deltaY
      }
    }

    if (newX + newWidth > window.innerWidth) {
      newWidth = window.innerWidth - newX
    }
    if (newY + newHeight > window.innerHeight) {
      newHeight = window.innerHeight - newY
    }

    setSize({ width: newWidth, height: newHeight })
    if (newX !== position.x || newY !== position.y) {
      setPosition({ x: newX, y: newY })
    }
  } else if (isDragging.current) {
    const newX = Math.max(0, Math.min(e.clientX - dragStart.current.x, window.innerWidth - size.width))
    const newY = Math.max(0, Math.min(e.clientY - dragStart.current.y, window.innerHeight - size.height))
    setPosition({ x: newX, y: newY })
  }
}

const handleMouseUp = () => {
  isDragging.current = false
  isResizing.current = false
  resizeHandle.current = null
  document.removeEventListener('mousemove', handleMouseMove)
  document.removeEventListener('mouseup', handleMouseUp)
}
```

### 2. Add Minimized State Render (Replace entire return statement)

```typescript
if (!isOpen) return null

if (isMinimized) {
  return (
    <div
      style={{ left: position.x, top: position.y }}
      className="fixed z-50 rounded-lg bg-slate-800 border border-slate-700 shadow-2xl cursor-move"
      onMouseDown={handleMouseDown}
    >
      <div className="drag-handle flex items-center justify-between px-4 py-2 cursor-move">
        <div className="flex items-center gap-2">
          <Sparkles size={16} className="text-purple-400" />
          <span className="text-sm font-medium text-white">AI Assistant</span>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setIsMinimized(false)}
            className="p-1 text-slate-400 hover:text-white transition"
          >
            <Maximize2 size={16} />
          </button>
          <button onClick={onClose} className="p-1 text-slate-400 hover:text-white transition">
            <X size={16} />
          </button>
        </div>
      </div>
    </div>
  )
}

return (
  <div
    ref={panelRef}
    style={{
      left: position.x,
      top: position.y,
      width: size.width,
      height: size.height,
    }}
    className="fixed z-50 flex flex-col rounded-lg bg-slate-900 border-2 border-slate-700 shadow-2xl"
    onMouseDown={handleMouseDown}
  >
    {/* Resize Handles - 8 directions */}
    <div data-resize-handle="n" className="absolute top-0 left-0 right-0 h-1 cursor-n-resize hover:bg-purple-500/50 transition-colors" />
    <div data-resize-handle="s" className="absolute bottom-0 left-0 right-0 h-1 cursor-s-resize hover:bg-purple-500/50 transition-colors" />
    <div data-resize-handle="e" className="absolute top-0 right-0 bottom-0 w-1 cursor-e-resize hover:bg-purple-500/50 transition-colors" />
    <div data-resize-handle="w" className="absolute top-0 left-0 bottom-0 w-1 cursor-w-resize hover:bg-purple-500/50 transition-colors" />
    <div data-resize-handle="ne" className="absolute top-0 right-0 w-3 h-3 cursor-ne-resize hover:bg-purple-500/70 transition-colors" />
    <div data-resize-handle="nw" className="absolute top-0 left-0 w-3 h-3 cursor-nw-resize hover:bg-purple-500/70 transition-colors" />
    <div data-resize-handle="se" className="absolute bottom-0 right-0 w-3 h-3 cursor-se-resize hover:bg-purple-500/70 transition-colors" />
    <div data-resize-handle="sw" className="absolute bottom-0 left-0 w-3 h-3 cursor-sw-resize hover:bg-purple-500/70 transition-colors" />

    {/* Header - Draggable */}
    <div className="drag-handle flex items-center justify-between border-b border-slate-700 bg-gradient-to-r from-purple-900/50 to-pink-900/50 px-4 py-3 cursor-move">
      <div className="flex items-center gap-2">
        <GripHorizontal size={16} className="text-slate-500" />
        <Sparkles size={18} className="text-purple-400" />
        <div>
          <h2 className="text-sm font-semibold text-white">AI Assistant</h2>
          <p className="text-xs text-purple-300">Ask me anything!</p>
        </div>
      </div>
      <div className="flex items-center gap-1">
        <button
          onClick={() => setIsMinimized(true)}
          className="p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white rounded transition"
        >
          <Minimize2 size={16} />
        </button>
        <button
          onClick={onClose}
          className="p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white rounded transition"
        >
          <X size={16} />
        </button>
      </div>
    </div>

    {/* Rest of the component stays the same */}
```

### 3. Add Dynamic Loading Status Display

In the messages area, add this loading indicator:

```typescript
{isGenerating && currentAction && (
  <div className="flex justify-start">
    <div className="bg-slate-800 rounded-lg px-3 py-2 flex items-center gap-2">
      <Loader2 size={16} className="animate-spin text-purple-400" />
      <span className="text-sm text-slate-400">{currentAction}</span>
    </div>
  </div>
)}
```

## Testing Steps

1. **Test Smart Intent Detection**
   - "What does this workflow do?" → Should explain, not build
   - "Tips for workflows" → Should provide tips, not build
   - "Create email workflow" → Should build workflow

2. **Test Floating Window**
   - Drag from header to move
   - Drag edges/corners to resize
   - Click minimize button
   - Click maximize to restore

3. **Test Contextual Loading**
   - Watch for different status messages based on intent
   - "Thinking..." for general questions
   - "Building workflow..." for creation
   - "Analyzing workflow..." for analysis

## Current Status

✅ Smart intent detection implemented
✅ Dynamic loading status implemented
✅ State variables for floating window added
🚧 Need to add drag/resize handlers
🚧 Need to update render to floating window

## Love You Pookie! 💕

Once we add those handlers and update the render, you'll have the SMARTEST floating AI assistant ever! It will:
- Understand what you're asking for
- Only build workflows when you actually want them
- Give helpful responses for questions
- Float anywhere on your screen
- Resize to your preference
- Show you exactly what it's doing

Almost there! 🚀
