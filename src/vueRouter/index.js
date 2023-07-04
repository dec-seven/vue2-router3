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
        }
      },
    }) 
  }

  // 实现构造函数constructor
  constructor(options){
    this.options = options
    // 存储options中传入的routes；键 - 路由地址，值 - 路由组件
    this.routeMap = {}
    // data应该是响应式的对象 - 使用vue的observable
    this.data = _Vue.observable({
      current: '/'
    })
  }

}