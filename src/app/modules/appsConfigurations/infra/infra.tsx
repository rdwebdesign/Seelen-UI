import { EditAppModal } from './EditModal';
import { createSelector } from '@reduxjs/toolkit';
import { Button, Input, Modal, Switch, Table, Tooltip } from 'antd';
import { ColumnsType, ColumnType } from 'antd/es/table';
import { ChangeEvent, useState } from 'react';
import { useDispatch } from 'react-redux';

import { useAppSelector, useAppStore } from '../../shared/app/hooks';
import { RootSelectors } from '../../shared/app/selectors';
import { StateAppsToYamlApps, YamlToState_Apps } from '../../shared/app/StateBridge';
import { cx } from '../../shared/app/utils';
import { getSorterByBool, getSorterByText } from '../app/filters';
import { AppsConfigActions } from '../app/reducer';

import { AppConfiguration, AppConfigurationExtended, ApplicationOptions, LabelByAppOption } from '../domain';

import cs from './index.module.css';

const ReadonlySwitch = (value: boolean, record: AppConfigurationExtended, _index: number) => {
  return (
    <Switch
      value={value}
      disabled
      className={cx({
        [cs.readonly!]: record.isTemplate,
      })}
    />
  );
};

const columns: ColumnsType<AppConfigurationExtended> = [
  {
    title: 'Name',
    dataIndex: 'name',
    key: 'name',
    fixed: 'left',
    width: 120,
    sorter: getSorterByText('name'),
    render: (name) => (
      <Tooltip placement="topLeft" title={name}>
        {name}
      </Tooltip>
    ),
  },
  {
    title: 'Identifier',
    dataIndex: 'identifier',
    key: 'identifier',
    width: 120,
    sorter: getSorterByText('identifier'),
    render: (identifier) => (
      <Tooltip placement="topLeft" title={identifier}>
        {identifier}
      </Tooltip>
    ),
  },
  {
    title: 'By',
    dataIndex: 'kind',
    key: 'kind',
    width: 80,
    align: 'center',
    sorter: getSorterByText('kind'),
  },
  {
    title: 'Strategy',
    dataIndex: 'matchingStrategy',
    key: 'matchingStrategy',
    width: 110,
    align: 'center',
    sorter: getSorterByText('matchingStrategy'),
  },
  {
    title: 'Category',
    dataIndex: 'category',
    key: 'category',
    width: 120,
    render(value, _record, _index) {
      return value || '-';
    },
    sorter: getSorterByText('category'),
  },
  {
    title: 'Monitor',
    dataIndex: 'monitor',
    key: 'monitor',
    width: 120,
    render(value, _record, _index) {
      return value != null ? `Monitor ${value + 1}` : '-';
    },
    sorter: getSorterByText('monitor'),
  },
  {
    title: 'Workspace',
    dataIndex: 'workspace',
    key: 'workspace',
    width: 120,
    render(value, _record, _index) {
      return value || '-';
    },
    sorter: getSorterByText('workspace'),
  },
  ...Object.values(ApplicationOptions).map(
    (option) =>
      ({
        title: LabelByAppOption[option],
        dataIndex: option,
        key: option,
        align: 'center',
        width: 140,
        render: ReadonlySwitch,
        sorter: getSorterByBool(option),
      } as ColumnType<AppConfigurationExtended>),
  ),
  {
    title: <ActionsTitle />,
    key: 'operation',
    fixed: 'right',
    align: 'center',
    width: 56,
    render: (_, record, index) => <Actions record={record} index={index} />,
  },
];

function ActionsTitle() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const dispatch = useDispatch();

  const showModal = () => setIsModalOpen(true);
  const onCancel = () => setIsModalOpen(false);
  const onSave = (app: AppConfiguration) => {
    dispatch(AppsConfigActions.push([app]));
    setIsModalOpen(false);
  };

  return (
    <div>
      <EditAppModal open={isModalOpen} isNew onSave={onSave} onCancel={onCancel} />
      <Button className={cs.newBtn} type="primary" onClick={showModal}>
        New
      </Button>
    </div>
  );
}

function Actions({ record }: { record: AppConfigurationExtended; index: number }) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const dispatch = useDispatch();

  const showModal = () => setIsModalOpen(true);
  const onCancel = () => setIsModalOpen(false);
  const onSave = (app: AppConfigurationExtended) => {
    if (record.isTemplate) {
      // eslint-disable-next-line @ts/no-unused-vars
      const { isTemplate, templateName, templateDescription, ...cleanApp } = app;
      dispatch(AppsConfigActions.push([cleanApp]));
    } else {
      dispatch(AppsConfigActions.replace({ idx: record.key, app }));
    }
    setIsModalOpen(false);
  };

  return (
    <div className={cs.actions}>
      {isModalOpen && (
        <EditAppModal
          open
          idx={record.isTemplate ? undefined : record.key}
          onSave={onSave}
          onCancel={onCancel}
          readonlyApp={record.isTemplate ? record : undefined}
        />
      )}
      <Button type={record.isTemplate ? 'default' : 'primary'} onClick={showModal}>
        {record.isTemplate ? '👁️' : '✏️'}
      </Button>
    </div>
  );
}

export function AppsConfiguration() {
  const [selectedAppsKey, setSelectedAppsKey] = useState<number[]>([]);
  const [searched, setSearched] = useState('');
  const apps: AppConfigurationExtended[] = useAppSelector(
    createSelector(RootSelectors.appsConfigurations, (apps) => {
      return apps
        .map((app, index) => ({ ...app, key: index }))
        .filter((app) => app.name.toLowerCase().includes(searched) || app.identifier.toLowerCase().includes(searched))
        .reverse(); // the last added should be show at the top
    }),
  );

  const templates: AppConfigurationExtended[] = useAppSelector(
    createSelector(RootSelectors.appsTemplates, (templates) => {
      return templates
        .flatMap((template) => {
          return template.apps.map((app, i) => ({
            ...app,
            key: `${template.name}-${i}` as unknown as number,
            isTemplate: true,
            templateName: template.name,
            templateDescription: template.description,
          }));
        })
        .filter((app) => app.name.toLowerCase().includes(searched) || app.identifier.toLowerCase().includes(searched))
        .reverse();
    }),
  );

  const dispatch = useDispatch();
  const store = useAppStore();

  const importApps = async () => {
    const yamlApps = await window.backgroundApi.importApps();
    const newApps = YamlToState_Apps(yamlApps);
    console.log(newApps);
    dispatch(AppsConfigActions.push(newApps));
  };

  const performSwap = () => {
    dispatch(AppsConfigActions.swap(selectedAppsKey as [number, number]));
  };

  const exportApps = () => {
    const { appsConfigurations } = store.getState();
    const appsToExport = selectedAppsKey.map((key) => appsConfigurations[key]!);
    window.backgroundApi.exportApps(StateAppsToYamlApps(appsToExport));
  };

  const confirmDelete = () => {
    const modal = Modal.confirm({
      title: 'Confirm Delete',
      content: 'Sure on delete these applications?',
      okText: 'delete',
      onOk: () => {
        dispatch(AppsConfigActions.deleteMany(selectedAppsKey));
        setSelectedAppsKey([]);
        modal.destroy();
      },
      okButtonProps: { danger: true },
      cancelText: 'cancel',
      centered: true,
    });
  };

  const onSearch = (e: ChangeEvent<HTMLInputElement>) => setSearched(e.target.value.toLowerCase());
  columns[0]!.title = (
    <Input value={searched} onChange={onSearch} onClick={(e) => e.stopPropagation()} placeholder="Name" />
  );

  return (
    <>
      <Table
        dataSource={[...apps, ...templates]}
        columns={columns}
        pagination={{ defaultPageSize: 20 }}
        scroll={{ y: 350, x: '100vw' }}
        className={cs.table}
        rowSelection={{
          selectedRowKeys: selectedAppsKey,
          onChange(selectedRowKeys, _selectedRows, _info) {
            setSelectedAppsKey(selectedRowKeys as number[]);
          },
          getCheckboxProps(record) {
            return {
              disabled: record.isTemplate,
            };
          },
        }}
      />
      <div className={cs.footer}>
        <Button onClick={importApps}>Import</Button>
        <Button onClick={exportApps} disabled={!selectedAppsKey.length}>
          Export
        </Button>
        <Button type="primary" danger disabled={!selectedAppsKey.length} onClick={confirmDelete}>
          Delete
        </Button>
        <Button onClick={performSwap} type="primary" disabled={selectedAppsKey.length !== 2}>
          Swap
        </Button>
      </div>
    </>
  );
}