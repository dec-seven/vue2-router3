let _Vue = null

// 导出一个VueRouter的类
export default class VueRouter {
  
  // 实现install静态方法
  static install(Vue) {
    // 判断当前插件是否已经被安装
    if(VueRouter.install.installed){
      return 
    }
    VueRouter.install.installed = true
    
    // 把Vue构造函数记录到全局变量
    _Vue = Vue
    
    // 把创建Vue实例的时候传入的router对象注入到实例上
    
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

  // 实现构造函数constructor
  constructor (options) {
    this.options = options
    // 存储options中传入的routes；键 - 路由地址，值 - 路由组件
    this.routeMap = {}
    // data应该是响应式的对象 - 使用vue的observable
    this.data = _Vue.observable({
      current: '/'
    })
  }

  // 用一个init 方法包装createRouteMap和initComponents两个初始化方法
  init(){
    this.createRouteMap()
    this.initComponents(_Vue)
  }

  // 作用：把构造函数中传过来的routes(路由规则)转换成键值对的形式存储到routeMap
  createRouteMap () {
    // 遍历所有的路由规则（routes),把路由规则解析成键值对的形式，存储到routeMap中
    this.options.routes.forEach(route => {
      this.routeMap[route.path] = route.component
    })
  }


  initComponents (Vue) {
    // 实现router-link标签，router-link 最终被渲染成 a 标签
    Vue.component('router-link',{
      props:{
        to:String
      },
      // 使用template模版实现（运行时环境无法编译，需要使用完整版本 - 运行时+编译器）
      // template:'<a :href="to"><slot></slot></a>'
     
      // 使用render函数实现
      render(h) {
        return h('a',{
          attrs:{
            href: this.to
          }
        },[this.$slots.default]) 
      }
    })


  }
}