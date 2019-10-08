import Dep from "./uitils/Dep.js";
import { log_error,log } from "./uitils/log";
//import { indexedDB, IDBTransaction, IDBKeyRange } from "./global";
import { isArray, isObject } from "./uitils/type.js";

class DB {
  constructor({ dbName, version }) {
    this.dbName = dbName;
    this.version = version;
    this.db = null;
    this.idb = null;
    this.table = [];
    this._status = false; // 是否先添加了表
    this._dep_ = new Dep();
  }

  /**
   * 打开数据库
   * @success 成功的回调，返回db，非必传
   * @error 失败的回调，返回错误信息，非必传
   * */
  open(ops) {
    let success = () => {},
      error = () => {};

    if (ops) {
      success = ops.success ? ops.success : success;
      error = ops.error ? ops.error : error;
    }

    // 打开前要先添加表
    if (this.table.length == 0 && !this._status) {
      error("打开前要先用add_table添加表");
      return;
    }

    if (typeof success !== "function") {
      error("open中success必须是一个function类型");
      return;
    }

    const request = indexedDB.open(this.dbName, this.version);

    request.onerror = e => {
      error(e.currentTarget.error.message);
    };

    request.onsuccess = e => {
      this.db = e.target.result;
      this._dep_.notify();
			success(this.db);
    };

    request.onupgradeneeded = e => {
      this.idb = e.target.result;

      for (let i = 0; i < this.table.length; i++) {
        this.__create_table(this.idb, this.table[i]);
      }
    };
  }

  //  关闭数据库
  close_db() {
    const handler = () => {
      this.db.close();
    };

    this.__action(handler);
  }

  // 删除数据库
  delete_db() {
    indexedDB.deleteDatabase(name);
  }

  //清空某张表的数据
  clear_table( tableName ) {
    this.__action(() =>
      this.__create_transaction(tableName, "readwrite").clear()
    );
  }

  /**
   * 添加一张表
   * @param tableOption<Object>
   * @tableName 表名
   * @option 表配置
   * @index 索引配置
   * */
  add_table(tableOption = {}) {
    this._status = false;
    this.table.push(tableOption);
  }

  /**
   * @method 查询
   * @param String tableName 表名
   * @param  Mixed  condition 查询的条件，遍历，与filter类似
	 *   @arg {Object} 每个元素
	 *   @return 条件
	 * 传入非函数时为查询全部，传入函数为条件查询
   * @return Promise
   * */
  query( tableName, condition) {
		return new Promise((resolve, reject)=>{
			if( typeof condition !== "function"){
				condition=()=>true
			}
			
			const handler = () => {
				let res = [];
				const request = this.__create_transaction(tableName, "readonly").openCursor()
				
				request.onsuccess = e =>
					this.__cursor_success(e, {
						condition,
						handler: ({ currentValue }) => res.push(currentValue),
						over: () => resolve(res)
					});
					
				request.onerror = e => reject('query,in openCursor onerror ')
			};
			
			this.__action(handler);
			
		})
  }

  /**
   * @method 增加数据
   * @param String tableName 表名
	 * @param Object data 插入的数据
   * @return Promise
   * */
  insert(tableName, data) {
		return new Promise((resolve, reject)=>{
			if (!(isArray(data) || isObject(data))) {
			  reject("in insert，data type is Object or Array");
			}
			this.__action(() => {
			  const store = this.__create_transaction(tableName, "readwrite");
			  isArray(data) ? data.forEach(v => store.put(v)) : store.put(data);
			  // this.__create_transaction(tableName, "readwrite").add(data);
			  resolve(data);
			});
		})
  }

  /**
   * @method 删除数据
   * @param  String tableName 表名
   * @param  Function|String|Number condition 查询的条件或主键（String|Number），遍历，与filter类似
	 *   @arg {Object} 每个元素
	 *   @return 条件	当以主键删除无返回
   * @return Promise
   * */
  delete(tableName, condition ) {
		return new Promise((resolve, reject)=>{
			let handler,request
			if (typeof condition !== "function") {
				handler= () => {
					request = this.__create_transaction(tableName, "readwrite").delete(condition);
					request.onsuccess = () => resolve();
					request.onerror = () => reject();
				}
			}else{
				handler = () => {
				  let res = [];
				
				  request= this.__create_transaction(
				    tableName,
				    "readwrite"
				  ).openCursor()
					request.onsuccess = e =>
				    this.__cursor_success(e, {
				      condition,
				      handler: ({ currentValue, cursor }) => {
				        res.push(currentValue);
				        cursor.delete();
				      },
				      over: () => {
				        if (res.length == 0) {
				          reject(`in delete ,数据库中没有任何符合condition的元素`);
				        }else{
									resolve(res);
								}
				      }
				    });
					request.onerror = e => reject('delete,in openCursor onerror ')
				};
			}
			
			this.__action(handler);
		})
  }
  

  /**
   * @method 修改数据
   * @param String tableName 表名
	 * @param Function\|String\|Number  target String|Number,按目标主键值 Function 查询的条件，遍历，与filter类似
	 * 	 @arg {Object} 每个元素
   *   @return 条件
   * @param Function handle 处理函数，接收本条数据的引用，对其修改
   * @return Promise
   * */
  update( tableName, condition, handle) {
		return new Promise((resolve, reject)=>{
			if (typeof handle !== "function") {
			  reject("in update,handle必须是一个function类型");
			}else{
				const handler = () => {
					if (typeof condition !== "function"){
						
						const store = this.__create_transaction(tableName, "readwrite");
						const request = store.get(condition);
						request.onsuccess =e => {
							const currentValue = e.target.result;
							handle(currentValue);
							store.put(currentValue);
							resolve(currentValue);
						}
						request.onerror= e=>reject('delete,in openCursor onerror ')
						
					}else{
						
						let res = [];
						const request= this.__create_transaction(tableName,"readwrite").openCursor()
						request.onsuccess = e =>
							this.__cursor_success(e, {
								condition,
								handler: ({ currentValue, cursor }) => {
									handle(currentValue);
									res.push(currentValue);
									cursor.update(currentValue);
								},
								over: () => {
									if (res.length == 0) {
										//reject(`in update ,数据库中没有任何符合condition的元素`);
										resolve(null);
									}else{
										resolve(res);
									}
								}
							});
						request.onerror= e=>reject('delete,in openCursor onerror ')
						
					}  
				};
				
				this.__action(handler);
			}
		})
  }

  /**
   * @method 查询数据（主键值，索引）
   * @param String tableName 表名
	 * @param Number|String|Array|Object target 主键值
	 * @return Promise
   * */
  find(tableName, target) {
		return new Promise((resolve, reject)=>{
				const handleFn = () => {
					let request ,indexName,value
					if(isArray(target)){
						[indexName,value]=target
						request =this.__create_transaction(tableName, "readonly").index(indexName).getAll(value)
					}else if(isObject(target)){
						for(let key in target){
							indexName=key
							value= target[key]
						}
						if(value){
							request =this.__create_transaction(tableName, "readonly").index(indexName).getAll(value)
						}else{
							request =this.__create_transaction(tableName, "readonly").index(indexName).getAll()
						}
					}else{
						request =this.__create_transaction(tableName, "readonly").getAll(target)
					}
					request.onsuccess = e => {
				    const result = e.target.result||null;
				    resolve(result);
				  };
					request.onerror = e => reject('find,in openCursor onerror ')
				};
				this.__action(handleFn);
		})
  }

  

  /**
   * @method 游标开启成功,遍历游标
   * @param {Function} 条件
   * @param {Function} 满足条件的处理方式 @arg {Object} @property cursor游标 @property currentValue当前值
   * @param {Function} 游标遍历完执行的方法
   * @return {Null}
   * */
  __cursor_success(e, { condition, handler, over }) {
    const cursor = e.target.result;
    if (cursor) {
      const currentValue = cursor.value;
      if (condition(currentValue)) handler({ cursor, currentValue });
      cursor.continue();
    } else {
      over();
    }
  }

  /**
   * @method 开启事务
   * @param {String} 表名
   * @param {String} 事务权限
   * @return store
   * */
  __create_transaction(tableName, mode = "readwrite") {
    if (!tableName || !mode) {
      throw new Error("in __create_transaction,tableName and mode is required");
    }
    const transaction = this.db.transaction(tableName, mode);
    return transaction.objectStore(tableName);
  }

  // db是异步的,保证fn执行的时候db存在
  __action(handler) {
    const action = () => {
      handler();
    };
    // 如果db不存在，加入依赖
    if (!this.db) {
      this._dep_.add(action);
    } else {
      action();
    }
  }

  /**
   * 创建table
   * @option<Object>  keyPath指定主键 autoIncrement是否自增
   * @index 索引配置
   * */
  __create_table(idb, { tableName, option, indexs = [] }) {
    if (!idb.objectStoreNames.contains(tableName)) {
      let store = idb.createObjectStore(tableName, option);
      for (let indexItem of indexs) {
        this.__create_index(store, indexItem);
      }
    }
  }

  /**
   * 创建索引
   * @option<Object> unique是否是唯一值
   * */
  __create_index(store, { key, option }) {
    store.createIndex(key, key, option);
  }
}

export default DB;
