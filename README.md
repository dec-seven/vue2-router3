# vue2-router3

## 实现过程会涉及以下`vue`内容

-   插件
-   混入
-   `Vue.observable()`
-   插槽
-   `render`函数
-   运行时和完整版的`Vue`

## 实现一个`VueRouter`

### `VueRouter`类图

-   属性

    -   `options`：存储路由相关的配置`mode`、`routes`等
    -   `data`：响应式对象，使用`observable` `API`处理
    -   `routeMap`：以键值对的形式存储 `{路径:组件}`

-   方法

    -   `install`：`Vue` 插件需要对外暴露的 `install` 方法，将来会被`Vue.use()`使用。
    -   `constructor`：构造函数
    -   `init` 函数：全局初始化。
    -   `createRouteMap`：创建路径`path`与组件`component`的映射。
    -   `initComponents`：初始化 `Router-View` 和 `Router-Link` 组件。
    -   `initEvent`: 监听浏览器 `history` 的 `popstate` 事件，当页面 `URL` 变化时，将会触发监听事件。

### 1. 新建`VueRouter`类

使用`Vue-Cli` 创建一个`Vue`项目`vue create vue2-router3`，并安装`vue-router`。

新建一个`vuerouter`文件夹，然后在里面新建`index.js`，当前`js`文件默认导出一个`VueRouter`类。

```js
// vuerouter/index.js
export default class VueRouter { }
```

### 2. 实现`install`方法

首先我们思考`install`方法要实现什么功能？

-   功能①：判断插件是否已经被安装，如果已经安装则不需要重复安装了
-   功能②：记录`Vue`的构造函数到全局变量中，给`VueRouter`中的实例方法使用，例如`router-link`、`router-view`这两个组件需要调用`Vue.component`创建。
-   功能③：把创建`Vue`实例时传入的`router`对象，注入到`Vue`实例上。我们使用的`this.$router`就是在此时入住到`Vue`实例上的。

要实现`install`方法，也就是实现这三个功能：

```js
// vuerouter/index.js

let _Vue = null
export default class VueRouter{

  // 在VueRouter类里定义一个静态方法install
  static install(Vue) {
    // 实现功能① 
    // 执行install方法时添加一个installed属性，记录插件被安装了
    // 判断该属性为true时，说明已经安装过了，直接return
    if(VueRouter.install.installed){
      return 
    }
    VueRouter.install.installed = true
    
    // 实现功能②
    // 在VueRouter类外面定义_Vue变量
    // 用于接收传过来的Vue构造函数
    _Vue = Vue
    
    // 实现功能③
    // 把创建Vue实例的时候传入的router对象注入到Vue实例上  
    // 这里要用到混入，具体原因如果不懂，可以看下后面的解释  
    _Vue.mixin({
      beforeCreate() {
        if(this.$options.router){
          _Vue.prototype.$router = this.$options.router
        }
      },
    }) 
  }
}
```

`install`方法中功能①和功能②比较简单易懂，功能③可能稍微难懂一些。所以再梳理一遍实现思路。
  
我们在创建`Vue`项目时，在`main.js`文件中会使用`new Vue({router,render: h => h(App)}).$mount('#app')`来创建`Vue`根组件实例，在这时会传入`router`对象，我们`install`方法中的功能③需要做的就是将`router`注入到所有的`Vue`实例上，命名`$router`，即我们经常用的`this.$router`。
  
想让所有的实例共享一个成员，首先考虑到的是将`$router`设置到构造函数的原型上，在当前`VueRouter/index.js`文件中我们存储的`Vue`构造函数是`_Vue`，即最终挂载到`_Vue.prototype`上。

 但是我们现在还没有获取到`new Vue`传过来的`router`，`router`是在`new Vue`创建实例时传入的选项，因此想要获取到`router`必须要在能获取到`Vue`实例的时候。所以这里要用到混入，给所有的`Vue`实例混入一个选项，而选项里设置一个`beforeCreate`钩子函数，这样我们在`beforeCreate`钩子函数中就可以获取到`Vue`实例，也就可以获取到传入的`options`里的`router`

 至此我们就可以在`Vue`构造函数的`prototype`上挂载`$router` ，并赋值为`router`。


补充：

`Vue.js` 的插件应该暴露一个 `install` 方法。这个方法的第一个参数是 `Vue` 构造器，第二个参数是一个可选的选项对象。[详情可以查看Vue.js2官网文档插件部分](https://v2.cn.vuejs.org/v2/guide/plugins.html)。

### 3. 实现构造函数`constructor`

```js
 // vuerouter/index.js

let _Vue = null
export default class VueRouter{

  static install(Vue) {
    ...
  }
  
  constructor (options) {
    this.options = options 
    this.routeMap = {} // 以键值对的形式存储options中传入的routes；键 - 路由地址，值 - 路由组件
    // data应该是响应式的对象 - 使用vue的observable
    this.data = _Vue.observable({
      current: '/'
    })
  }
}
```

### 4. 实现`createRouteMap()`

`createRouteMap`函数的主要功能就是遍历所有的路由规则（`routes`），把路由规则解析成键值对的形式，然后存储到`routeMap`中。

```js
 // vuerouter/index.js

let _Vue = null
export default class VueRouter{

  static install(Vue) {
    ...
  }
  
  constructor (options) {
    ...
  }
  
  createRouteMap () {
    this.options.routes.forEach(route => {
      this.routeMap[route.path] = route.component
    })
  }
}
```

### 5. 实现`initComponents()`

`constructor`函数用来注册`<Router-Link></Router-Link>`和`<Router-View></Router-View>`组件。

#### `router-link`

-   `router-link`最终渲染成1个`a`标签
-   将`router-link`的`to`属性设置到`a`标签的`herf`属性（默认使用`history`方法）
-   使用slot插槽，将`router-link`的内容，插入`a`标签中

```js
// vuerouter/index.js

let _Vue = null
export default class VueRouter{

  static install(Vue) {
    ...
  }
  
  constructor (options) {
    ...
  }
  
  createRouteMap () {
    ...
  }

  initComponents (Vue) {
    // 实现router-link组件，router-link 最终被渲染成 a 标签
    Vue.component('router-link',{
      props:{
        to:String
      },     
      // 使用render函数实现
      // 这里也可以用template模版实现，
      // 但是需要配置runtimeCompiler为true，使用包含运行时编译器的 Vue 构建版本
      // template:'<a :href="to"><slot></slot></a>'
      render(h) {
        return h('a',{
          attrs:{
            href: this.to
          },
          // 给a标签对应的dom对象注册事件
          on:{
            click: this.clickHandler
          }
        },[this.$slots.default]) 
      },
     methods: {
        clickHandler (e) {
          history.pushState({},'',this.to)
          this.$router.data.current = this.to
          // 阻止默认行为
          e.preventDefault();
        }
      },
    })
  }
}
```

这里我使用的是`render`函数，没有用`template`模版，因为`template`在`vue`运行时的版本里不支持，需要使用`vue`完整版即包含运行时编译器的`vue`构建版本，但这会应用额外增加 `10kb` 左右。[具体内容可以查看vue-cli官方文档](https://cli.vuejs.org/zh/config/#runtimecompiler)

```js
// vue.config.js
// 配置使用包含运行时编译器的Vue构建版本，在vue.config.js文件里配置runtimeCompiler属性为true即可。
module.exports = {
  runtimeCompiler:true
}
```

#### `router-view`

`router-view`这里要实现的功能就是根据`path`路径显示对应的`component`组件，这里要用到之前的`routeMap`对象，所以这里需要获取到`vue-router`的实例，`Vue.component`里的`this`指向当前`Vue`组件并不是`VueRouter`实例，所以我们先声明一个变量`self` 用来保存`vue-router`的实例。

```js
// vuerouter/index.js

let _Vue = null
export default class VueRouter{

  static install(Vue) {
    ...
  }
  
  constructor (options) {
    ...
  }
  
  createRouteMap () {
    ...
  }

  initComponents (Vue) {
    Vue.component('router-link',{...})
    
    const self = this // vue-router的实例
    Vue.component('router-view',{
      render(h){
        const component = self.routeMap[self.data.current]
        return h(component)
      }
    })
  }
}
```

### 6. 实现`init`

`init`就是一个全局的初始化方法，包装了`createRouteMap`和`initComponents`两个初始化方法

```js
// vuerouter/index.js

let _Vue = null
export default class VueRouter{

 static install(Vue) {
    if(VueRouter.install.installed){
      return 
    }
    VueRouter.install.installed = true
    _Vue = Vue
    _Vue.mixin({
      beforeCreate() {
        if(this.$options.router){
          _Vue.prototype.$router = this.$options.router
          this.$options.router.init()  // ++ 在install里调用全局init方法
        }
      },
    }) 
  }

  
  constructor (options) {
    ...
  }
  
  // 用一个init 方法包装createRouteMap和initComponents两个初始化方法
  init(){
    this.createRouteMap()
    this.initComponents(_Vue)
  }
  
  createRouteMap () {
    ...
  }

  initComponents (Vue) {
    Vue.component('router-link',{...})
    
    const self = this
    Vue.component('router-view',{...})
  }
}
```

### 7.体验自己实现的`Vue-Router`

修改`vue-router`引入路径，将引入的官方的`vue-router`改成我们自己写的`VueRouter`

```js
// router/index.js
...
// import VueRouter from 'vue-router'  // 官方的
import VueRouter from '../vueRouter'   // 我们的
...
```

最终实现的代码

```js
// vuerouter/index.js

let _Vue = null

export default class VueRouter {
  
  static install(Vue) {
    if(VueRouter.install.installed){
      return 
    }
    VueRouter.install.installed = true
    
    // 把Vue构造函数记录到全局变量
    _Vue = Vue
        
    // 混入
    _Vue.mixin({
      beforeCreate() {
        if(this.$options.router){
          _Vue.prototype.$router = this.$options.router
          this.$options.router.init()
        }
      },
    }) 
  }

  constructor (options) {
    this.options = options
    this.routeMap = {}
    this.data = _Vue.observable({
      current: '/'
    })
  }

  init(){
    this.createRouteMap()
    this.initComponents(_Vue)
  }

  createRouteMap () {
    this.options.routes.forEach(route => {
      this.routeMap[route.path] = route.component
    })
  }

  initComponents (Vue) {
    Vue.component('router-link',{
      props:{
        to:String
      },
      render(h) {
        return h('a',{
          attrs:{
            href: this.to
          },
          on:{
            click: this.clickHandler
          }
        },[this.$slots.default]) 
      },
      methods: {
        clickHandler (e) {
          history.pushState({},'',this.to)
          this.$router.data.current = this.to
          // 阻止默认行为
          e.preventDefault();
        }
      },
    })

    const self = this 
    Vue.component('router-view',{
      render(h){
        const component = self.routeMap[self.data.current]
        return h(component)
      }
    })
  }
}
```

启动项目 并 打开浏览器

![](https://p3-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/df0d65ad382e42d5a0469637dbb3e41a~tplv-k3u1fbpfcp-zoom-1.image)

![](https://p3-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/f5d6b46946584d5d97fbb9de2caa5902~tplv-k3u1fbpfcp-zoom-1.image)

通过点击`About`和`Home`可以实现页面切换，至此我们的`VueRouter`已经完成大半，但是还是有一些地方需要处理的。

我们当前默认按照`history`模式实现的，并没有实现根据`new Router`时传入的`mode`来使用对应的模式；另外我们点击浏览器的`返回`和`前进`按钮，会发现浏览器地址发生了变化，但是页面却没有变化。
