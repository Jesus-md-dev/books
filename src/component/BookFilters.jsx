import { Autocomplete, Chip, TextField } from '@mui/material';
import { PAGE_RANGES, RATING_OPTIONS } from '../utils/bookFilters';

/**
 * One titled group of option chips (multi or single select) with counts.
 * @param {object} props
 * @param {string} props.id - DOM id prefix for the heading.
 * @param {string} props.title - Group title.
 * @param {{id: string, label: string}[]} props.options - Options.
 * @param {Record<string, number>} props.counts - Books per option.
 * @param {string[]} props.selected - Selected option ids.
 * @param {(id: string) => void} props.onToggle - Toggle handler.
 * @returns {JSX.Element}
 */
const ChipGroup = ({ id, title, options, counts, selected, onToggle }) => (
  <div role="group" aria-labelledby={id} className="min-w-0">
    <h3 id={id} className="mb-1 text-sm font-semibold text-ink">{title}</h3>
    <div className="flex flex-wrap gap-1.5">
      {options.map((option) => {
        const active = selected.includes(option.id);
        const count = counts[option.id] ?? 0;
        return (
          <Chip
            key={option.id}
            size="small"
            clickable
            label={`${option.label} (${count})`}
            color={active ? 'primary' : 'default'}
            variant={active ? 'filled' : 'outlined'}
            aria-pressed={active}
            disabled={count === 0 && !active}
            onClick={() => onToggle(option.id)}
          />
        );
      })}
    </div>
  </div>
);

/**
 * Filter controls: category, length and rating chips plus a "rated by" selector.
 * Used inline on desktop and inside the drawer on mobile.
 * @param {object} props
 * @param {object} props.filters - Current filters.
 * @param {object} props.counts - Result of facetCounts.
 * @param {{categories: string[], voters: string[]}} props.options - Available options.
 * @param {(patch: object) => void} props.onChange - Receives the changed fields.
 * @param {string} [props.idPrefix] - Prefix to keep ids unique when rendered twice.
 * @returns {JSX.Element}
 */
const BookFilters = ({ filters, counts, options, onChange, idPrefix = 'filtros' }) => {
  const toggle = (key) => (value) => onChange({
    [key]: filters[key].includes(value) ? filters[key].filter((item) => item !== value) : [...filters[key], value],
  });

  return (
    <div className="flex flex-col gap-4 sm:gap-3">
      <ChipGroup
        id={`${idPrefix}-cat`}
        title="Categoría"
        options={options.categories.map((c) => ({ id: c, label: c }))}
        counts={counts.cat}
        selected={filters.cat}
        onToggle={toggle('cat')}
      />
      <ChipGroup
        id={`${idPrefix}-pag`}
        title="Extensión"
        options={PAGE_RANGES}
        counts={counts.pag}
        selected={filters.pag}
        onToggle={toggle('pag')}
      />
      <ChipGroup
        id={`${idPrefix}-nota`}
        title="Nota"
        options={RATING_OPTIONS}
        counts={counts.nota}
        selected={filters.nota ? [filters.nota] : []}
        onToggle={(value) => onChange({ nota: filters.nota === value ? '' : value })}
      />
      <div role="group" aria-labelledby={`${idPrefix}-socio`} className="max-w-xs">
        <h3 id={`${idPrefix}-socio`} className="mb-1 text-sm font-semibold text-ink">Valorado por</h3>
        <Autocomplete
          size="small"
          options={options.voters}
          value={filters.socio || null}
          onChange={(_, value) => onChange({ socio: value || '' })}
          getOptionDisabled={(name) => (counts.socio[name] ?? 0) === 0 && name !== filters.socio}
          getOptionLabel={(name) => name}
          renderOption={(props, name) => {
            const { key, ...rest } = props;
            return <li key={key} {...rest}>{`${name} (${counts.socio[name] ?? 0})`}</li>;
          }}
          noOptionsText="Nadie con ese nombre"
          renderInput={(params) => (
            <TextField {...params} placeholder="Cualquiera" inputProps={{ ...params.inputProps, 'aria-label': 'Valorado por' }} />
          )}
        />
      </div>
    </div>
  );
};

export default BookFilters;
