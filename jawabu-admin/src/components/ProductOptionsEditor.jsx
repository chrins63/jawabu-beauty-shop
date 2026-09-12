import { COLOR_PRESETS, SIZE_PRESETS, emptyOptionRow } from '../lib/productOptions'

export default function ProductOptionsEditor({
  optionType,
  rows,
  onTypeChange,
  onRowsChange,
}) {
  const presets = optionType === 'size' ? SIZE_PRESETS : COLOR_PRESETS
  const label = optionType === 'size' ? 'Size' : 'Colour'

  const updateRow = (index, patch) => {
    onRowsChange(
      rows.map((row, rowIndex) =>
        rowIndex === index ? { ...row, ...patch } : row
      )
    )
  }

  return (
    <section className="form-section">
      <div className="form-section-heading">
        <h2>Colours & sizes</h2>
        <p>
          You decide which options customers can buy. Leave this off if the
          product has only one version.
        </p>
      </div>

      <div className="form-field">
        <label htmlFor="option_type">This product has</label>
        <select
          id="option_type"
          value={optionType}
          onChange={(event) => onTypeChange(event.target.value)}
        >
          <option value="">No options — one version only</option>
          <option value="color">Colours (bags, lip gloss, etc.)</option>
          <option value="size">Sizes / ml (perfume, lotion, etc.)</option>
        </select>
      </div>

      {optionType ? (
        <div className="product-options-list">
          {rows.map((row, index) => (
            <div className="product-option-row" key={row.id || `new-${index}`}>
              <div className="form-field">
                <label>{label}</label>
                <input
                  list={`option-presets-${optionType}`}
                  value={row.option_value}
                  onChange={(event) =>
                    updateRow(index, { option_value: event.target.value })
                  }
                  placeholder={optionType === 'size' ? 'e.g. 50ml' : 'e.g. Black'}
                />
              </div>

              <div className="form-field">
                <label>SKU (optional)</label>
                <input
                  value={row.sku}
                  onChange={(event) =>
                    updateRow(index, { sku: event.target.value })
                  }
                  placeholder="Scan code"
                />
              </div>

              <div className="form-field">
                <label>Price (optional)</label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={row.price}
                  onChange={(event) =>
                    updateRow(index, { price: event.target.value })
                  }
                  placeholder="Same as product"
                />
              </div>

              <div className="form-field">
                <label>Stock</label>
                <input
                  type="number"
                  min="0"
                  step="1"
                  value={row.stock_quantity}
                  onChange={(event) =>
                    updateRow(index, { stock_quantity: event.target.value })
                  }
                />
              </div>

              <div className="form-field">
                <label>Photo URL (optional)</label>
                <input
                  value={row.image_url}
                  onChange={(event) =>
                    updateRow(index, { image_url: event.target.value })
                  }
                  placeholder="Different photo for this option"
                />
              </div>

              <label className="product-option-available">
                <input
                  type="checkbox"
                  checked={row.available}
                  onChange={(event) =>
                    updateRow(index, { available: event.target.checked })
                  }
                />
                Available for sale
              </label>

              {rows.length > 1 ? (
                <button
                  type="button"
                  className="back-button"
                  onClick={() =>
                    onRowsChange(rows.filter((_, rowIndex) => rowIndex !== index))
                  }
                >
                  Remove
                </button>
              ) : null}
            </div>
          ))}

          <datalist id={`option-presets-${optionType}`}>
            {presets.map((value) => (
              <option key={value} value={value} />
            ))}
          </datalist>

          <button
            type="button"
            className="back-button"
            onClick={() => onRowsChange([...rows, emptyOptionRow()])}
          >
            Add {label.toLowerCase()}
          </button>
        </div>
      ) : null}
    </section>
  )
}
