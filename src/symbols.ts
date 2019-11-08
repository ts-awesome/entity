export const ISqlDataDriverSymbol = Symbol.for('ISqlDataDriver');
export const UnitOfWorkSymbol = Symbol.for('UnitOfWork');
export const QueryExecutorProviderSymbol = Symbol.for('QueryExecutorProvider');
export const ISqlQueryCompilerSymbol = Symbol.for('ISqlQueryCompiler');
export const serviceFor = ({name}: Function) => Symbol.for(`IEntityService<${name}>`);
export const dbReaderFor = ({name}: Function) => Symbol.for(`IDbDataReader<${name}>`);

export const Symbols = {
  ISqlDataDriver: ISqlDataDriverSymbol,
  UnitOfWork: UnitOfWorkSymbol,
  QueryExecutorProvider: QueryExecutorProviderSymbol,
  ISqlQueryCompiler: ISqlQueryCompilerSymbol,
  serviceFor,
  dbReaderFor,
};

export default Symbols;
