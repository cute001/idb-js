import DB from "./DB";

function Idb({ dbName, version = 1, tables = [] }) {
  const db = new DB({
    dbName,
    version
  });

  for (let tableItem of tables) {
    // tableItem<Object> @tableName,@option,@indexs
    db.add_table(tableItem);
  }

  return new Promise((resolve, reject) => {
    db.open({
      success: () => {
        resolve(db);
      },
      error: err => {
        reject(err);
      }
    });
  });
}

export default Idb;