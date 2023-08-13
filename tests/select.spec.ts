import 'reflect-metadata';
import {EntityService, UnitOfWork, IEntityService} from '../dist';
import {TestCompiler, TestDriver} from '@ts-awesome/orm/dist/test-driver';
import {alias, and, count, dbField, dbTable, desc, of, Select, TableMetadataSymbol} from '@ts-awesome/orm';

@dbTable('Model')
class Model {
  @dbField({
    primaryKey: true,
  })
  public id!: number;
  @dbField
  public value!: string;
}

class Aggregated {
  @dbField public id!: number;
  @dbField public count!: number;
}

describe('select', () => {
  let service: IEntityService<Model, 'id', 'id', never>;
  const compiler = new TestCompiler();
  let driver!: TestDriver;
  const all: any = [{id: 1, value: 'test'}, {id: 2, value: 'other'}, {id: 3, value: 'other'}, {id: 4, value: 'other'}] as Model[];
  const aggregated: any = [{id: 1, count: 1}, {id: 2, count: 2}] as Aggregated[];

  beforeAll(() => {
    driver = new TestDriver();
    const uow = new UnitOfWork(driver);

    service = new EntityService(Model, uow, compiler) as any;
  });

  it('query all', async () => {
    driver.mapper = () => all;

    const result = await service.select().where(x => x.id.eq(5)).fetch()
    expect(result).toEqual(all);
  });

  it('query one', async () => {
    driver.mapper = () => all;

    const result = await service.select().where(({id}) => id.eq(2)).fetchOne();
    expect(result).toEqual(all[0]);
  });

  it('query all aggregated', async () => {
    driver.mapper = () => aggregated;

    const result = await service.select().where(x => x.id.eq(5)).fetch(Aggregated)
    expect(result).toEqual(aggregated);
  });

  it('query one aggregated', async () => {
    driver.mapper = () => aggregated;

    const result = await service.select().where(({id}) => id.eq(2)).fetchOne(Aggregated);
    expect(result).toEqual(aggregated[0]);
  });

  it('query with order by and limit', async () => {
    let query;
    driver.mapper = ({raw}) => {
      query = raw;
      return all;
    }

    const result = await service.select().where(({id}) => id.eq(2)).orderBy(['value']).limit(20).fetch();
    expect(result).toEqual(all);

    expect(query).toStrictEqual({
      "_alias": null,
      "_columns": [
        {
          "_column": {
            "name": "id",
            "table": "Model",
          },
        },
        {
          "_column": {
            "name": "value",
            "table": "Model",
          },
        },
      ],
      "_distinct": false,
      "_for": undefined,
      "_limit": 20,
      "_orderBy": [
        {
          "_column": {
            "name": "value",
            "table": "Model",
          }
        }
      ],
      "_table": Model[TableMetadataSymbol],
      "_type": "SELECT",
      "_where": [
        {
          "_operands": [
            {
              "_column": {
                "name": "id",
                "table": "Model",
              }
            },
            2
          ],
          "_operator": "="
        }
      ]
    })
  })

  it ('query with subqueries, order by and limit', async () => {
    @dbTable('actions')
    class PersonAction {
      @dbField public personId!: number;
      @dbField public action!: string;
      @dbField public created!: Date;
    }

    const ts = new Date(Date.now() - 3600);

    let query;
    driver.mapper = ({raw,}) => {
      query = raw;
      return all;
    }

    const result = await service.select()
      .columns(({id}) => [
        id,
        alias(
          Select(PersonAction)
            .columns(() => [count()])
            .where(({personId, action, created}) => and(
              personId.eq(of(Model, 'id')),
              action.eq('a'),
              created.gte(ts)
            ))
            .asScalar()
            .mul(1),
          'score'
        )
      ]).orderBy(() => [desc(of(null, 'score'))])
      .limit(20)
      .fetch();

    expect(result).toEqual(all);

    expect(query).toStrictEqual({
      "_alias": null,
      "_columns": [
        {
          "_column": {
            "name": "id",
            "table": "Model",
          }
        },
        {
          "_alias": "score",
          "_operands": [
            {
              "_operands": [
                {
                  "_operands": [
                    {
                      "_alias": null,
                      "_columns": [
                        {
                          "_args": [
                            "*"
                          ],
                          "_func": "COUNT"
                        }
                      ],
                      "_distinct": false,
                      "_for": undefined,
                      "_table": PersonAction[TableMetadataSymbol],
                      "_type": "SELECT",
                      "_where": [
                        {
                          "_operands": [
                            {
                              "_operands": [
                                {
                                  "_column": {
                                    "name": "personId",
                                    "table": "actions",
                                  }
                                },
                                {
                                  "_column": {
                                    "name": "id",
                                    "table": "Model",
                                  }
                                }
                              ],
                              "_operator": "="
                            },
                            {
                              "_operands": [
                                {
                                  "_column": {
                                    "name": "action",
                                    "table": "actions",
                                  }
                                },
                                "a"
                              ],
                              "_operator": "="
                            },
                            {
                              "_operands": [
                                {
                                  "_column": {
                                    "name": "created",
                                    "table": "actions",
                                  }
                                },
                                ts
                              ],
                              "_operator": ">="
                            }
                          ],
                          "_operator": "AND"
                        }
                      ]
                    }
                  ],
                  "_operator": "SUBQUERY"
                },
                1
              ],
              "_operator": "*"
            }
          ]
        }
      ],
      "_distinct": false,
      "_for": undefined,
      "_limit": 20,
      "_orderBy": [
        {
          "_column": {
            "name": "score"
          },
          "_order": "DESC"
        }
      ],
      "_table": Model[TableMetadataSymbol],
      "_type": "SELECT"
    });
  })
});
