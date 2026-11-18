// Tabelas PC* do Winthor (Oracle) imitadas no SQLite, só para o simulador (02 §"Schema Winthor do
// simulador"). NUNCA entram no setup-backend.mjs: na plataforma o SQL de lib/winthor-sql.mjs vai ao
// Oracle pelo jdbcId de add-002-jdbc-winthor.mjs; aqui roda sobre estas tabelas, com os mesmos nomes,
// pelo dialeto Oracle -> SQLite (mysql-dialect.mjs). Datas em VARCHAR(10). Só DDL: as linhas vêm do
// elenco (seed/000-elenco.mjs) e do `winthor()` de cada seed.
//
// ALL_TAB_COLUMNS (dicionário do Oracle) é preenchida a partir deste DDL, para `ccBaseWinthorDescobrir`.

export const DDL = [
  `CREATE TABLE IF NOT EXISTS PCCLIENT (
    CODCLI INT PRIMARY KEY,
    CLIENTE VARCHAR(200),
    FANTASIA VARCHAR(200),
    CGCENT VARCHAR(20),
    TIPOFJ VARCHAR(1),
    ESTENT VARCHAR(2),
    MUNICENT VARCHAR(80),
    ENDERENT VARCHAR(200),
    BAIRROENT VARCHAR(80),
    CEPENT VARCHAR(10),
    TELENT VARCHAR(40),
    EMAIL VARCHAR(160),
    CODATV1 INT,
    CODUSUR1 INT,
    CODPLPAG VARCHAR(10),
    LIMCRED DECIMAL(15,2),
    DTULTCOMP VARCHAR(10),
    DTCADASTRO VARCHAR(10),
    BLOQUEIO VARCHAR(1)
  )`,

  `CREATE TABLE IF NOT EXISTS PCATIVI (
    CODATIV INT PRIMARY KEY,
    RAMO VARCHAR(60)
  )`,

  `CREATE TABLE IF NOT EXISTS PCUSUARI (
    CODUSUR INT PRIMARY KEY,
    NOME VARCHAR(80)
  )`,

  `CREATE TABLE IF NOT EXISTS PCDEPTO (
    CODEPTO INT PRIMARY KEY,
    DESCRICAO VARCHAR(200)
  )`,

  `CREATE TABLE IF NOT EXISTS PCPRODUT (
    CODPROD INT PRIMARY KEY,
    DESCRICAO VARCHAR(200),
    CODEPTO INT
  )`,

  `CREATE TABLE IF NOT EXISTS PCPLPAG (
    CODPLPAG VARCHAR(10) PRIMARY KEY,
    DESCRICAO VARCHAR(80),
    NUMDIAS INT
  )`,

  `CREATE TABLE IF NOT EXISTS PCCOB (
    CODCOB VARCHAR(4) PRIMARY KEY,
    COBRANCA VARCHAR(60)
  )`,

  `CREATE TABLE IF NOT EXISTS PCFILIAL (
    CODIGO VARCHAR(4) PRIMARY KEY,
    RAZAOSOCIAL VARCHAR(200),
    FANTASIA VARCHAR(200),
    CGC VARCHAR(20),
    UF VARCHAR(2)
  )`,

  `CREATE TABLE IF NOT EXISTS PCNFSAID (
    NUMTRANSVENDA INT PRIMARY KEY,
    CODFILIAL VARCHAR(4),
    NUMNOTA INT,
    SERIE VARCHAR(4),
    CODCLI INT,
    DTSAIDA VARCHAR(10),
    VLTOTAL DECIMAL(15,2),
    DTCANCEL VARCHAR(10),
    TIPOVENDA VARCHAR(2),
    CODFISCAL INT,
    CONDVENDA INT,
    NUMPED INT
  )`,

  `CREATE TABLE IF NOT EXISTS PCMOV (
    NUMTRANSITEM INT PRIMARY KEY,
    NUMTRANSVENDA INT,
    CODFILIAL VARCHAR(4),
    CODPROD INT,
    CODCLI INT,
    CODOPER VARCHAR(2),
    DTMOV VARCHAR(10),
    QT DECIMAL(15,3),
    PUNIT DECIMAL(15,4),
    DTCANCEL VARCHAR(10),
    NUMNOTA INT
  )`,

  `CREATE TABLE IF NOT EXISTS PCMOVCOMPLE (
    NUMTRANSITEM INT PRIMARY KEY,
    VLSUBTOTITEM DECIMAL(15,2)
  )`,

  `CREATE TABLE IF NOT EXISTS PCPREST (
    NUMTRANSVENDA INT NOT NULL,
    PREST VARCHAR(4) NOT NULL,
    CODFILIAL VARCHAR(4),
    CODCLI INT,
    DUPLIC INT,
    VALOR DECIMAL(15,2),
    VPAGO DECIMAL(15,2),
    DTVENC VARCHAR(10),
    DTPAG VARCHAR(10),
    DTEMISSAO VARCHAR(10),
    CODCOB VARCHAR(4),
    DTCANCEL VARCHAR(10),
    PRIMARY KEY (NUMTRANSVENDA, PREST)
  )`,

  `CREATE TABLE IF NOT EXISTS PCPEDC (
    NUMPED INT PRIMARY KEY,
    NUMPEDCLI VARCHAR(40)
  )`,

  `CREATE TABLE IF NOT EXISTS ALL_TAB_COLUMNS (
    TABLE_NAME VARCHAR(30) NOT NULL,
    COLUMN_NAME VARCHAR(30) NOT NULL,
    COLUMN_ID INT NOT NULL,
    PRIMARY KEY (TABLE_NAME, COLUMN_NAME)
  )`,
];

/** Preenche ALL_TAB_COLUMNS com as colunas das PC* deste arquivo (idempotente). */
export function preencherColunasWinthor(db) {
  const inserir = db.prepare('INSERT OR IGNORE INTO ALL_TAB_COLUMNS (TABLE_NAME, COLUMN_NAME, COLUMN_ID) VALUES (?, ?, ?)');
  for (const sql of DDL) {
    const tabela = sql.match(/EXISTS\s+([A-Z0-9_]+)/)[1];
    if (!tabela.startsWith('PC')) continue;
    const corpo = sql.slice(sql.indexOf('(') + 1, sql.lastIndexOf(')'));
    corpo.split('\n').map((l) => l.trim()).filter((l) => /^[A-Z][A-Z0-9_]*\s/.test(l) && !/^PRIMARY\s+KEY/.test(l))
      .forEach((l, i) => inserir.run(tabela, l.split(/\s+/)[0], i + 1));
  }
}
