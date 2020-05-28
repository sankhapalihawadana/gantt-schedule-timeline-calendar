/**
 * ChartTimelineGrid component
 *
 * @copyright Rafal Pospiech <https://neuronet.io>
 * @author    Rafal Pospiech <neuronet.io@gmail.com>
 * @package   gantt-schedule-timeline-calendar
 * @license   AGPL-3.0 (https://github.com/neuronetio/gantt-schedule-timeline-calendar/blob/master/LICENSE)
 * @link      https://github.com/neuronetio/gantt-schedule-timeline-calendar
 */

import { Cell, RowWithCells, Vido, Rows } from '../../../../gstc';

/**
 * Bind element action
 */
class BindElementAction {
  constructor(element: HTMLElement, data) {
    const old = data.state.get('$data.elements.chart-timeline-grid');
    if (old !== element) data.state.update('$data.elements.chart-timeline-grid', element);
  }
  public destroy(element, data) {
    data.state.update('$data.elements', elements => {
      delete elements['chart-timeline-grid'];
      return elements;
    });
  }
}

export default function ChartTimelineGrid(vido: Vido, props) {
  const { api, state, onDestroy, Actions, update, html, reuseComponents, StyleMap } = vido;
  const componentName = 'chart-timeline-grid';
  const componentActions = api.getActions(componentName);
  const actionProps = { api, state };

  let wrapper;
  onDestroy(state.subscribe('config.wrappers.ChartTimelineGrid', value => (wrapper = value)));

  const GridRowComponent = state.get('config.components.ChartTimelineGridRow');

  const className = api.getClass(componentName);

  let onCellCreate;
  onDestroy(state.subscribe('config.chart.grid.cell.onCreate', onCreate => (onCellCreate = onCreate)));

  let debug;
  onDestroy(state.subscribe('config.debug', dbg => (debug = dbg)));

  const rowsComponents = [];
  const rowsWithCells: RowWithCells[] = [];
  const formatCache = new Map();
  const styleMap = new StyleMap({});

  function generateCells() {
    if (debug) console.log('[grid.ts] generateCells'); // eslint-disable-line no-console
    const width = state.get('$data.chart.dimensions.width');
    const height = state.get('$data.innerHeight');
    const scrollOffset = state.get('config.scroll.vertical.offset') || 0;
    const time = state.get('$data.chart.time');
    const periodDates = state.get(`$data.chart.time.levels.${time.level}`);
    if (!periodDates || periodDates.length === 0) {
      state.update('$data.chart.grid.rowsWithCells', []);
      return;
    }
    const visibleRowsId: string[] = state.get('$data.list.visibleRows');
    styleMap.style.height = height + scrollOffset + 'px';
    styleMap.style.width = width + 'px';
    let top = 0;
    rowsWithCells.length = 0;
    const rows: Rows = api.getAllRows();
    for (const rowId of visibleRowsId) {
      const row = rows[rowId];
      if (!row || !row.$data) {
        if (debug) console.warn('generateCells EMPTY ROW', { row, rowId, visibleRowsId, rows }); // eslint-disable-line no-console
        continue;
      }
      const cells: Cell[] = [];
      for (const time of periodDates) {
        let format;
        if (formatCache.has(time.leftGlobal)) {
          format = formatCache.get(time.leftGlobal);
        } else {
          format = api.time.date(time.leftGlobal).format('YYYY-MM-DDTHH:mm');
          formatCache.set(time.leftGlobal, format);
        }
        const id = row.id + ':' + format;
        let cell: Cell = { id, time, row, top };
        for (const onCreate of onCellCreate) {
          cell = onCreate(cell);
        }
        cells.push(cell);
      }
      rowsWithCells.push({ row, cells, top, width });
      top += row.$data.outerHeight;
    }
    state.update('$data.chart.grid.rowsWithCells', rowsWithCells);
  }
  onDestroy(
    state.subscribeAll(
      [
        '$data.list.rowsHeight',
        '$data.list.visibleRows;',
        '$data.list.visibleRowsHeight',
        'config.chart.items.*.rowId',
        'config.chart.items.*.time',
        `$data.chart.time.levels`,
        '$data.innerHeight',
        '$data.chart.dimensions.width'
      ],
      generateCells,
      {
        bulk: true
      }
    )
  );

  function generateRowsComponents() {
    if (debug) console.log('[grid.ts] generate rows components'); // eslint-disable-line no-console
    const rowsWithCells = state.get('$data.chart.grid.rowsWithCells');
    reuseComponents(rowsComponents, rowsWithCells || [], row => row, GridRowComponent, false);
    update();
  }
  onDestroy(state.subscribeAll(['$data.chart.grid.rowsWithCells;', 'config.list.rows'], generateRowsComponents));
  onDestroy(() => {
    rowsComponents.forEach(row => row.destroy());
  });
  componentActions.push(BindElementAction);
  const actions = Actions.create(componentActions, actionProps);

  const slots = api.generateSlots(componentName, vido, props);

  return templateProps =>
    wrapper(
      html`
        <div class=${className} data-actions=${actions} style=${styleMap}>
          ${slots.html('before', templateProps)}${rowsComponents.map(r => r.html())}${slots.html(
            'after',
            templateProps
          )}
        </div>
      `,
      { props, vido, templateProps }
    );
}
