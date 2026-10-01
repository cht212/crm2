type UnknownRecord = Record<string, unknown>

const fieldLabels: Record<string, string> = {
  code: 'Código',
  codigo: 'Código',
  name: 'Nombre',
  nombre: 'Nombre',
  product_type_id: 'Tipo de producto',
  type_id: 'Tipo',
  tipo: 'Tipo',
  subtype_id: 'Subtipo',
  subtipo: 'Subtipo',
  max_quantity: 'Cantidad máxima',
  value: 'Valor',
  unit: 'Unidad',
  related_value: 'Valor relacionado',
  valor_relacionado: 'Valor relacionado',
}

const isRecord = (value: unknown): value is UnknownRecord =>
  typeof value === 'object' && value !== null

const translateValidationMessage = (message: string): string => {
  if (/already been taken/i.test(message))
    return 'Este valor ya está registrado. Ingresa uno diferente.'

  if (/field is required/i.test(message))
    return 'Este campo es obligatorio.'

  if (/selected .* is invalid/i.test(message))
    return 'La opción seleccionada no es válida.'

  return message
}

const getErrorData = (error: unknown): UnknownRecord => {
  if (!isRecord(error))
    return {}

  if (isRecord(error.data))
    return error.data

  if (isRecord(error.response) && isRecord(error.response._data))
    return error.response._data

  return error
}

export const getCatalogValidationErrors = (error: unknown): Record<string, string[]> => {
  const data = getErrorData(error)
  const errors = isRecord(data.errors) ? data.errors : {}
  return Object.entries(errors).reduce<Record<string, string[]>>((result, [field, value]) => {
    const values = Array.isArray(value) ? value : [value]
    const fieldName = field.split('.')[0]
    const messages = values
      .filter((message): message is string => typeof message === 'string')
      .map(translateValidationMessage)

    if (messages.length)
      result[fieldName] = [...(result[fieldName] ?? []), ...messages]

    return result
  }, {})
}

export const getCatalogValidationMessages = (error: unknown): string[] => {
  const errors = getCatalogValidationErrors(error)
  const messages = Object.entries(errors).flatMap(([field, fieldMessages]) =>
    fieldMessages.map(message => `${fieldLabels[field] ?? field}: ${message}`),
  )

  if (messages.length)
    return messages

  const data = getErrorData(error)

  return typeof data.message === 'string' ? [translateValidationMessage(data.message)] : []
}
