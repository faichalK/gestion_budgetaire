import { useEffect, useId, useState } from 'react'
import { cn } from '../../lib/cn'
import { parseInputMontant, formaterMontant } from '../../utils/formatters'

export default function InputMontant({
  label,
  value,
  onChange,
  placeholder = '0',
  required    = false,
  disabled    = false,
  min         = 0,
  max,
  error,
  hint,
  id,
  name,
  style,
}) {
  const reactId = useId()
  const [rawInput, setRawInput] = useState(value !== undefined && value !== null && value !== '' ? String(value) : '')
  const [focused,  setFocused]  = useState(false)

  const clampValue = (parsed) => {
    if (isNaN(parsed)) return parsed
    let nextValue = parsed
    if (typeof min === 'number') nextValue = Math.max(min, nextValue)
    if (typeof max === 'number') nextValue = Math.min(max, nextValue)
    return nextValue
  }

  // Sync externe → input (uniquement si pas focalisé)
  useEffect(() => {
    if (focused) return
    const nextValue = value !== undefined && value !== null && value !== '' ? String(value) : ''
    if (nextValue === rawInput) return
    const timeoutId = window.setTimeout(() => setRawInput(nextValue), 0)
    return () => window.clearTimeout(timeoutId)
  }, [value, focused, rawInput])

  const handleChange = (e) => {
    const raw = e.target.value
    setRawInput(raw)
    const parsed = parseInputMontant(raw)
    if (!isNaN(parsed)) {
      onChange?.(parsed)
    } else if (raw === '' || raw === '-') {
      onChange?.('')
    }
  }

  const handleBlur = () => {
    setFocused(false)
    const parsed = parseInputMontant(rawInput)
    if (!isNaN(parsed)) {
      const clamped = clampValue(parsed)
      setRawInput(String(clamped))
      onChange?.(clamped)
    }
  }

  // Preview du montant formaté
  const preview = (() => {
    const parsed = parseInputMontant(rawInput)
    if (isNaN(parsed) || rawInput === '') return null
    return formaterMontant(parsed)
  })()

  const inputId = id || name || reactId

  return (
    <div style={style}>
      {label && (
        <label
          htmlFor={inputId}
          className="block text-[13px] font-semibold text-[#374151] mb-[6px]"
        >
          {label}
          {required && <span className="text-[#EF4444] ml-[3px]">*</span>}
        </label>
      )}
      <div className="relative">
        <input
          id={inputId}
          name={name}
          type="text"
          inputMode="numeric"
          value={rawInput}
          onChange={handleChange}
          onFocus={() => setFocused(true)}
          onBlur={handleBlur}
          placeholder={placeholder}
          disabled={disabled}
          required={required}
          className={cn(
            'w-full h-[42px] px-[14px] pr-[52px] border rounded-[6px] font-mono text-[13px] text-[#0E2A47] bg-white leading-[1.5]',
            'transition-[border-color,box-shadow] duration-[140ms] outline-none',
            'placeholder:text-[#A89B88]',
            'focus:border-[#B8864A] focus:bg-[#FFFEF9]',
            'disabled:bg-[#FAF8F3] disabled:text-[#A89B88] disabled:cursor-not-allowed',
            error
              ? 'border-[#DC2626] bg-[#FDF5F4] focus:shadow-[0_0_0_3px_rgba(220,38,38,0.12)]'
              : 'border-[rgba(14,42,71,0.16)] focus:shadow-[0_0_0_3px_rgba(184,134,74,0.12)]',
          )}
          aria-describedby={hint || preview ? `${inputId}-hint` : undefined}
        />
        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[11px] font-bold text-[#9CA3AF] pointer-events-none">
          FCFA
        </span>
      </div>
      {(preview || hint || error) && (
        <div id={`${inputId}-hint`} className="mt-1 text-[12px]">
          {error ? (
            <span className="text-[#DC2626]">{error}</span>
          ) : (
            <>
              {preview && (
                <span className="text-[#163A5F] font-mono font-semibold">
                  = {preview}
                </span>
              )}
              {hint && (
                <span className={`text-[#9CA3AF]${preview ? ' ml-2' : ''}`}>{hint}</span>
              )}
            </>
          )}
        </div>
      )}
    </div>
  )
}
