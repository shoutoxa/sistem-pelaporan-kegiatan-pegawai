import Icon from './Icon.jsx'

export default function Notice({ tone = 'info', children }) {
  return <div className={`notice ${tone}`} role={tone === 'error' ? 'alert' : 'status'}><Icon name={tone === 'success' ? 'check' : 'info'} /><span>{children}</span></div>
}
