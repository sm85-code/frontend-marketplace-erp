import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import Attributes from './Attributes'

describe('Attributes', () => {
  it('renders a free-text attribute that Shopee sends without attribute_value_list', () => {
    const html = renderToStaticMarkup(<Attributes nodes={[{ attribute_id: 7, name: 'Bahan', mandatory: false }]} values={[]} change={() => {}} />)
    expect(html).toContain('Bahan')
  })
})
