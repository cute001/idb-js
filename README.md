# idb-js
基于indexdb本地数据库的封装

[文档地址](https://verybigorange.github.io/idb-js/)

### _安装：_
```
	git clone https://github.com/cute001/idb-js 
	cd idb-js
	npm run build 
```

### _使用：_
* 第一步： 引入Idb
```
	import Idb from './Idb-js.js'  //  引入Idb
```
* 第二步： 引入数据库配置
```
	import db_student_config from './db_student_config'
```
  
* 第三步： 载入配置，数据库开启成功拿到数据库实例进行操作
```
	Idb(db_student_config).then(student_db => {...})
```

## _数据库实例db方法：_

### 注意事项：
* 因为查询操作多条数据是采用游标方式，所以操作单条数据的时候建议采用主键或者索引的的方式效率更高
* 采用游标的方法时，其中condition需要返回条件（很多小伙伴忽略了这点，特别说明^-^）

### 数据库与表（store）：
方法|方法名|参数|参数属性
--|:--|:--:|:--
close_db|关闭数据库|空|-
delete_db|删除数据库|空|-  
clear_table|清空某张表的数据|tableName|String 表名 （required）

### 添加（insert） 返回Promise：
成功在then中，失败在catch中，方便查询成功后反回 Promise.resolve(),做链式操作

方法|方法名|参数|参数属性
--|:--|:--:|:--
insert|添加单条或者多条数据|tableName|String 表名 （required）
||data|Object 数据 （required）

### 查询（query） 返回Promise：
返回数组，或NULL，即使查到一个也是返回数组，查不到返回空,不建议用qurey条件查询，建议使用

方法|方法名|参数|参数属性
--|:--|:--:|:--
query|查询匹配到的数据（可查多条,游标）|tableName|String 表名 （required）
||condition|Mixed  匹配条件,不传或非函数时为查询全部
find|根据索引查询|tableName|String 表名 （required）
||target| Number\|String\|Array\|Object 为数字或字符时，查询主键，为数组或对像为索引查询（required）

### 删除（delete）返回Promise：
方法|方法名|参数|参数属性
--|:--|:--:|:--
delete|删除数据（可删多条，游标）|tableName| String 表名 （required）
||condition|Function\|String\|Number 为Function按条件删除 其它按主键删除 （required）


### 修改（update）返回Promise：
方法|方法名|参数|参数属性
--|:--|:--:|:--
update|修改数据（可改多条，游标）|tableName|tableName String 表名 （required）
||condition|Function\|String\|Number 为Function按条件修改 其它按主键修改 （required）
||handle| Function 修改方式 （required） @arg {Object} 修改项

## 例子：

### _数据库配置：_
```
    // in db_student_config.js
    export default {
        dbName: "student",                          // *数据库名称
        version: 1,                                 // 数据库版本号（默认为当前时间戳）
        tables: [                                   // *数据库的表，即ObjectStore
            {
                tableName: "grade",                 // *表名
                option: { keyPath: "id", autoIncrement: true },          // 表配置，即ObjectStore配置，不指定主键
                indexs: [                           // 数据库索引（建议加上索引）
                    {
                        key: "name"，
                        option:{  unique: true }// 索引配置，此处表示该字段不允许重复
                    },
                    {
                        key: "score"
                    }
                ]
            },
            {
                tableName: "info",                      // *表名 另外一张表，同理
                option: { keyPath: "id" },
                indexs: [
                    {
                        key: "id",
                        option:{
                            unique: true
                        }
                    },
                    {
                         key: "name"
                    },
                    {
                         key: "age"
                    },
                    {
                         key: "sex"
                    }
                ]
            }
        ]
    };
```


### _使用：_

```
    // 载入数据配置，数据库开启成功后会拿到db来对数据库进行操作

    import Idb from 'idb-js'  //  引入Idb
    import db_student_config from './db_student_config'   //  引入数据库配置

    Idb(db_student_config).then(student_db => {     //  载入配置，数据库开启成功后返回该数据库实例

       /**
        * @method close_db 关闭此数据库
        * */
    
        student_db.close_db();
    
    
        /**
        * @method delete_db 删除此数据库
        * */
    
        student_db.delete_db();
    
    
        /**
        * @method 增加单条数据
        * */
    
        student_db.insert("grade",{
                    id: 1,
                    score: 98,
                    name: "小明"
        });
           
           
        /**
        * @method 增加多条数据
        * */
    
        student_db.insert("grade",[
            {
                id: 1,
                score: 98,
                name: "小明"
            },{
                id: 2,
                score: 99,
                name: "小方"
            }
        ]).then(response=>{
					//array [{id:1,score:98,name:"小明"},{id:2,score:99,name:"小方"}];
				});
    
    
		/**
		* @method 查询数据（游标） 
		* */

		student_db.query("grade");//所有数据，
		student_db.query("grade",item=>item.score>91);//条件查询，第二个参数必须是函数
		student_db.find("grade",20);//条件查询 第二个参数为Number|String 按主键查询
		student_db.find("grade",['score',91]);//条件查询 第二个参数为Array ['索引','值'] 按索引查询   
		student_db.find("grade",{'score':91});//条件查询 第二个参数为Object {'索引':'值'} 按索引查询      
            
		/**
		* @method 删除数据
		* */

		student_db.delete("grade",(item)=> item.name == '小明');//条件删除 第二个参数为函数 按条件
		student_db.delete("grade",22);//按主键删除 第二个参数为主键
    

		/**
		* @method 清空某张表的数据
		* */
		student_db.clear_table('grade')
            
		/**
		* @method 修改数据
		* */
				
		student_db.update(
			"grade",
			item => item.name === '小明',//第二个参数非函数时按主键更新
			r => r.score = 80;//可以设置多个键
		});
    }
```
