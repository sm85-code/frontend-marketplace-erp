import { Fragment } from 'react'

// A deliberately small Markdown subset. Provider output remains React text;
// no HTML, URL execution or raw markup injection is permitted.
function Inline({ text }: { text: string }) {
  return <>{text.split(/(\*\*[^*\n]+\*\*)/g).map((part, i) =>
    part.startsWith('**') && part.endsWith('**')
      ? <strong key={i}>{part.slice(2, -2)}</strong>
      : <Fragment key={i}>{part}</Fragment>)}</>
}
export default function AssistantAnswer({ text }: { text: string }) {
  const lines = text.split('\n')
  const blocks = []
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim()
    if (!line) continue
    const heading = line.match(/^#{1,3}\s+(.+)$/)
    const list = line.match(/^(?:[-*]\s+|\d+[.)]\s+)(.+)$/)
    if (list) {
      const items = [list[1]]
      const ordered = /^\d/.test(line)
      while (i + 1 < lines.length) {
        const next = lines[i + 1].trim().match(ordered ? /^\d+[.)]\s+(.+)$/ : /^[-*]\s+(.+)$/)
        if (!next) break
        items.push(next[1]); i++
      }
      const Tag = ordered ? 'ol' : 'ul'
      blocks.push(<Tag key={i} className={`space-y-1 pl-5 ${ordered ? 'list-decimal' : 'list-disc'}`}>{items.map((t, j) => <li key={j}><Inline text={t}/></li>)}</Tag>)
    } else if (heading) {
      blocks.push(<p key={i} className="font-semibold"><Inline text={heading[1]}/></p>)
    } else {
      blocks.push(<p key={i}><Inline text={line}/></p>)
    }
  }
  return <div className="space-y-3 break-words text-sm leading-relaxed [overflow-wrap:anywhere]">{blocks}</div>
}
