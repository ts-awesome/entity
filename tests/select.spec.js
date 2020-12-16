require('reflect-metadata');
const {EntityService, UnitOfWork} = require('../dist');
const {TestCompiler, TestDriver} = require('@ts-awesome/orm-test-driver');
const { DbReader } = require('@ts-awesome/orm');

class Model {}

Model.prototype.tableInfo = {
  tableName: 'test-table',
  primaryKey: 'id',
  fields: (() => {
    const fields = new Map();
    fields.set('id', { primaryKey: true, getValue(x) { return x.id } });
    fields.set('value', { getValue(x) { return x.value } });
    return fields;
  })(),
  indexes: [],
}

describe('select', () => {
  let service;
  const compiler = new TestCompiler();
  const all = [{id: 1, value: 'test'}, {id: 2, value: 'other'}, {id: 3, value: 'other'}, {id: 4, value: 'other'}];

  beforeAll(() => {
    const driver = new TestDriver();
    const uow = new UnitOfWork(driver);
    const reader = new DbReader(Model);

    service = new EntityService(Model, uow, compiler, reader);
  });

  it('query all', async () => {
    compiler.mapper = () => all;

    const result = await service.select().fetch();
    expect(result).toEqual(all);
  });

  it('query one', async () => {
    compiler.mapper = () => all;

    const result = await service.select().fetchOne();
    expect(result).toEqual(all[0]);
  });
});
