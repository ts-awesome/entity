export default {
  ISqlDataDriver: Symbol.for('ISqlDataDriver'),
  UnitOfWork: Symbol.for('UnitOfWork'),
  QueryExecutorProvider: Symbol.for('QueryExecutorProvider'),
  ISqlQueryCompiler: Symbol.for('ISqlQueryCompiler'),
  serviceFor(Model: Function) {
    return Symbol.for(`IEntityService<${Model.name}>`);
  },

  dbReaderFor(Model: Function) {
    return Symbol.for(`IDbDataReader<${Model.name}>`);
  },
}
