import Icon from './Icon.jsx'

export default function PageState({ tone = 'loading', title, message, action }) {
  return <div className={`page-state ${tone}`} role={tone === 'error' ? 'alert' : 'status'}><span className="state-icon"><Icon name={tone === 'error' ? 'info' : 'refresh'} /></span><div><strong>{title}</strong><p>{message}</p></div>{action}</div>
}
