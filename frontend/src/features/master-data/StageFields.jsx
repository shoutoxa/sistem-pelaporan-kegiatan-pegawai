import JobFields from './JobFields.jsx'

export default function StageFields(props) {
  const value = {
    ...props.value,
    namaPekerjaan: props.value?.namaPekerjaan || props.value?.namaTahapan || '',
  }
  const onChange = (updated) => {
    props.onChange({
      ...updated,
      namaTahapan: updated.namaPekerjaan,
    })
  }
  return <JobFields {...props} value={value} onChange={onChange} />
}
