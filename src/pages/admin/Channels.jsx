import { useEffect, useState } from 'react'
import { Phone, MessageSquare, Mail } from 'lucide-react'
import { useApi } from '../../hooks/useApi.js'
import { PageHeader, Card, Field, Textarea, Toggle, Badge, Button, ErrorBanner, Banner } from '../../components/ui'

const ICONS = { sms: Phone, whatsapp: MessageSquare, email: Mail }

// Message from the API error (FastAPI sends {"detail": "..."}), else the raw text.
function errorText(e) {
  const raw = e?.message || String(e)
  try { return JSON.parse(raw).detail || raw } catch { return raw }
}

function fillSample(text, variables) {
  return variables.reduce((out, v) => out.split(`{${v.name}}`).join(v.sample), text || '')
}

function ChannelCard({ channel, variables, onSave }) {
  const [wording, setWording] = useState(channel.template || '')
  const [enabled, setEnabled] = useState(channel.enabled !== false)
  const [saving, setSaving]   = useState(false)
  const [error, setError]     = useState(null)
  const [saved, setSaved]     = useState(false)

  // Pick up changes from the server (e.g. after a save elsewhere) unless mid-edit.
  const dirty = wording !== (channel.template || '') || enabled !== (channel.enabled !== false)
  useEffect(() => {
    if (!dirty) { setWording(channel.template || ''); setEnabled(channel.enabled !== false) }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [channel.template, channel.enabled])

  const Icon = ICONS[channel.type] || Mail
  const live = channel.delivery?.mode === 'live'
  const preview = fillSample(wording, variables)

  async function save() {
    setSaving(true); setError(null); setSaved(false)
    try {
      await onSave(channel.id, { template: wording, enabled })
      setSaved(true)
    } catch (e) {
      setError(errorText(e))
    } finally {
      setSaving(false)
    }
  }

  function addVariable(name) {
    setWording(w => `${w}${w && !/\s$/.test(w) ? ' ' : ''}{${name}}`)
    setSaved(false)
  }

  return (
    <Card className="h-full flex flex-col">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-9 h-9 rounded-lg bg-surface-alt flex items-center justify-center shrink-0">
            <Icon size={18} className="text-ink-muted" />
          </div>
          <h2 className="text-base font-semibold text-ink">{channel.name}</h2>
          <Badge color={live ? 'green' : 'amber'}>{live ? 'Live' : 'Simulated'}</Badge>
        </div>
        <Toggle className="shrink-0" checked={enabled} onChange={v => { setEnabled(v); setSaved(false) }}
                label={enabled ? 'On' : 'Off'} />
      </div>
      <p className="mt-3 text-sm text-ink-muted 2xl:min-h-[4.5rem]">{channel.delivery?.detail}</p>

      <div className="mt-4 space-y-4 flex-1 flex flex-col">
        <ErrorBanner error={error} />

        <Field label="Default wording"
               hint="Used for every alert on this channel, unless the rule that raised it has its own message.">
          <Textarea id={`wording-${channel.id}`} rows={5} value={wording}
                    onChange={e => { setWording(e.target.value); setSaved(false) }} />
        </Field>

        <div>
          <div className="text-xs font-semibold text-ink-muted uppercase tracking-wide mb-1.5">Insert</div>
          <div className="flex flex-wrap gap-1.5">
            {variables.map(v => (
              <button key={v.name} type="button" onClick={() => addVariable(v.name)} title={v.description}
                      className="px-2 py-1 text-xs font-mono rounded border border-line bg-white text-ink-muted hover:bg-surface-alt hover:text-ink transition-colors">
                {`{${v.name}}`}
              </button>
            ))}
          </div>
        </div>

        <div>
          <div className="flex items-baseline justify-between mb-1.5">
            <span className="text-xs font-semibold text-ink-muted uppercase tracking-wide">Preview with sample values</span>
            <span className="text-xs text-ink-muted tabular-nums">
              {preview.length} characters{channel.type === 'sms' ? ` · ${Math.max(1, Math.ceil(preview.length / 160))} SMS` : ''}
            </span>
          </div>
          <div className="px-3 py-2.5 rounded-md bg-surface border border-line text-sm text-ink whitespace-pre-wrap break-words">
            {preview || <span className="text-ink-muted">Nothing to preview.</span>}
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 mt-auto pt-1">
          {saved && !dirty && <span className="text-sm text-sev-low">Saved</span>}
          <Button onClick={save} loading={saving} disabled={!dirty}>Save {channel.name}</Button>
        </div>
      </div>
    </Card>
  )
}

export default function Channels() {
  const { data: channels, loading, error, update } = useApi('/api/channels')
  const { data: variables } = useApi('/api/channels/variables')

  return (
    <div>
      <PageHeader
        title="Channels"
        description="How alerts reach people, and the default wording for each. A rule can override the wording with its own message."
      />
      <div className="p-6 space-y-6">
        <Banner variant="info" title="Who gets which channel">
          Each person's channels (and their addresses) are set on the Stakeholders page. Switching a channel off here
          stops all alerts on it; they are recorded as skipped.
        </Banner>

        {error && <ErrorBanner error={`Couldn't load channels: ${error}`} />}
        {loading && channels.length === 0 && <p className="text-sm text-ink-muted">Loading…</p>}

        {/* 3 across on wide screens; below that, one column at a readable width (3 cards never leave one orphaned). */}
        <div className="grid grid-cols-1 2xl:grid-cols-3 gap-6 items-stretch max-w-3xl 2xl:max-w-none">
          {channels.map(ch => (
            <ChannelCard key={ch.id} channel={ch} variables={variables} onSave={update} />
          ))}
        </div>
      </div>
    </div>
  )
}
