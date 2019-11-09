export const UnitOfWorkSymbol = Symbol.for(`IUnitOfWork<ISqlQuery>`);
export const serviceSymbolFor = ({name}: Function) => Symbol.for(`IEntityService<${name}>`);

export const Symbols = {
  UnitOfWork: UnitOfWorkSymbol,
  serviceFor: serviceSymbolFor,
};

export default Symbols;
