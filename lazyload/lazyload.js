KISSY.add(function (S, Node) {
	var $ = Node.all,
		DOM = S.DOM,
		SCROLL = 'scroll',
		RESIZE = 'resize';

	var defaultConfig = {

        /**
         *  懒加载图片存放src的自定义属性
         */		
		lazyAttr: 'data-ks-lazyload',

        /**
         *  用以标识懒区域的class
         */			
		lazyCls: 'cls-ks-lazyload',

        /**
         *  距离视口触发懒加载的阈值
         */			
		threshold: 100,

        /**
         *  触发懒加载后的加载延迟     
         */	
		delay: 400,

        /**
         *  在水平方向进行懒加载
         */			
		scrollX: false,

        /**
         *  在垂直方向进行懒加载
         */			
		scrollY: true,

        /**
         *  进行懒加载的对象数组，如{ele: '#div', fn: callbackFn}
         */			
		callback: []
	};

    /**
     *	懒加载组件
     *  @constructor
     */
	function LazyLoad(container, config) {
		var self = this;

        if (!(self instanceof LazyLoad)) {
            return new Lazyload(containers, config);
        }

        //若容器没有指定，默认以document做为容器进行懒加载元素搜索
        if (container === undefined) {
        	self.container = [Node.one(document)];
        } 
        else if (!S.isArray(container)) {
        	self.container = [container];
        }
        //支持多个容器，以数组形式传入
        else {
			self.container = container;
        }

        //合并配置
		self.config = S.merge(defaultConfig, config);
		self._init();
	}

    /**
     *	懒加载组件
     *  @prototype
     */
	S.augment(LazyLoad, {

        /**
         *  初始化函数
         */
		_init: function() {
			var self = this;

			self.callback = self.config.callback;

			//更新懒加载的img和textarea元素
			self.updateLazyElement();

			//执行加载，渲染打开页面时就出现在视口范围内的元素   
			self._resizeFn();

			//设置事件监听的回调函数的执行延迟以及执行上下文
			self._scrollLoad = S.throttle(self._scrollFn, self.config.delay, self);
			self._resizeLoad = S.throttle(self._resizeFn, self.config.delay, self);
			
			//启动事件监听
			self._start();
		},

        /**
         *  启动事件监听
         */
		_start : function() {
			var self = this,
				$win  = Node.one(window);

			//console.log('start listen');
			$win.on(SCROLL, self._scrollLoad);
			$win.on(RESIZE, self._resizeLoad);
		},

        /**
         *  停止事件监听
         */
		_stop : function() {
			var self = this,
				$win  = Node.one(window);

			//console.log('stop listen');	
			$win.detach(SCROLL, self._scrollLoad);
			$win.detach(RESIZE, self._resizeLoad);
		},

        /**
         *  scroll事件的回调函数
         */
		_scrollFn : function() {
			var self = this;

			//加载元素
			self._loadLazyElement();

			//若三类懒元素（img、textarea、自定义回调函数）均加载完，则停止监听
			if (self._getLazyEleLength() < 1) {
				self._stop();
			}
		},

        /**
         *  resize事件的回调函数
         */
		_resizeFn : function() {
			var self = this;

			//进行resize后，需要重新计算视口的大小
			self.viewportWidth = DOM.viewportWidth();
			self.viewportHeight = DOM.viewportHeight();

			self._scrollFn();
		},

        /**
         *  更新img、textarea懒元素列表
         */
		updateLazyElement : function() {
			var self = this,
				containerArr = self.container,
				lazyImg = [], lazyArea = [];

			//对多个容器进行遍历，获取容器内部懒元素
			for (var i = 0, len = containerArr.length; i < len; i ++) {
				var ele = containerArr[i];
				lazyImg = lazyImg.concat(self._getLazyImg(ele));
				lazyArea = lazyArea.concat(self._getLazyArea(ele));
			}

			self.img = lazyImg;
			self.area = lazyArea;
		},

        /**
         *  获得容器内的img懒元素
         */
		_getLazyImg : function(element) {
			var self = this,
				lazyImg = $(element).all('img[' + self.config.lazyAttr + ']');

			return S.makeArray(lazyImg);
		},

        /**
         *  获得容器内的textarea懒元素
         */
		_getLazyArea : function(element) {
			var self = this,
				lazyArea = $(element).all('textarea.' + self.config.lazyCls);
	
			return S.makeArray(lazyArea);
		},

        /**
         *  获得三类懒元素的总数
         */
		_getLazyEleLength : function() {
			var self = this;

			//console.log(self.img.length + ' ' + self.area.length + ' ' + self.callback.length);
			return self.img.length + self.area.length + self.callback.length;
		},		

        /**
         *  加载懒元素
         */
		_loadLazyElement : function () {
			var self = this;

			self._loadLazyImg();
			self._loadLazyArea();
			self._loadLazyCallback();
		},

        /**
         *  加载img懒元素
         */
		_loadLazyImg : function() {
			var self = this;

			//把尚未加载的懒元素保存
			self.img = S.filter(self.img, self._filterImg, self);
		},

        /**
         *  过滤img懒元素
         */
		_filterImg : function(element) {
			var self = this;  		    

			//只对在视口附近的元素进行加载
			if (self._inViewport(element)) {
				self._renderLazyImg(element);
			} 
			else {
				return true;
			}
		},

        /**
         *  渲染img懒元素
         */
		_renderLazyImg : function(element) {
			var self = this,
				$ele = $(element),
				lazyAttr = self.config.lazyAttr;
				
			var imgSrc = $ele.attr(lazyAttr);
			if (imgSrc) {
				$ele.attr('src', imgSrc);

				//移除懒元素的自定义属性，以免因container嵌套发生重复加载
				$ele.removeAttr(lazyAttr);
			}
			//console.log('img');
		},		

        /**
         *  加载textarea懒元素
         */
		_loadLazyArea : function() {
			var self = this;

			//把尚未加载的懒元素保存
			self.area = S.filter(self.area, self._filterArea, self);
		},

        /**
         *  过滤textarea懒元素
         */
		_filterArea : function(element) {
			var self = this;

			//只对在视口附近的元素进行加载
			if (self._inViewport(element)) {
				self._renderLazyArea(element);
			}
			else {
				return true;
			}
		},		

        /**
         *  渲染textarea懒元素
         */
		_renderLazyArea : function(element) {
			var self = this,
				$ele = $(element),
				lazyCls = self.config.lazyCls;

			if ($ele.hasClass(self.config.lazyArea)) {

				//创建一个新div节点，插入到textarea前
				var newNode = $('<div>');
				newNode.html($ele.val(), true).insertBefore($ele);

				//移除该textarea的懒元素class属性，避免被重复加载
				$ele.removeClass(lazyCls).hide();
			}

			//console.log('area');
		},		

        /**
         *  加载callback懒元素
         */
		_loadLazyCallback : function() {
			var self = this;

			self.callback = S.filter(self.callback, self._filterCallback, self);
		},

        /**
         *  过滤callback懒元素
         */
		_filterCallback : function(obj) {
			var self = this;

			//如果指定的元素不存在，直接返回false
			if ($(obj.ele).length < 1) {
				return false;
			}

			if (self._inViewport(obj.ele)) {
				self._fireCallback(obj);
			}
			else {
				return true;
			}
		},		

        /**
         *  触发用户自定义的回调函数
         */
		_fireCallback : function(obj) {
			var ele = obj.ele,
				fn = obj.fn;

			if (S.isFunction(fn)) {
				fn.call(ele);
			}

			//console.log('callback');
		},

        /**
         *  判断元素是否在视口及其阈值范围内
         */
		_inViewport : function(element) {
			var self = this,
				$ele = $(element),
				elementOffset = $ele.offset(),
				threshold = self.config.threshold,	
				eleBelow = false,
				eleLeft = false;	 	//该变量为true，表示元素在浏览器视口之外的情况

	        /**
	         *  若当前懒元素或其祖先元素设置了display:none，则排除该元素。
	         *
	         *  1. 若当前元素自身设置了display:none，那么其高度和宽度（通过width和height函数获得的高度和宽度）
	         *  会是元素真实的宽高值，但元素的offset().top，offset().left会是window的escrollTop和Left的值；
	         *  2. 若当前元素的祖先元素设置了display:none，img元素的width和height会是0，textarea的width和height
	         *	是-4。
	         *  3. 在chrome下，如果img的src属性设置成空字符串，那么使用width获得宽度的为0，在firefox下则是24px；故
	         *  img懒元素需要设置默认得placeholer属性。
	         *   
	         *
	         *  因此以上三种情况会引发这些懒元素马上被加载，故进行排除。
	         */

			if ($ele.css('display') == 'none' || $ele.width() <= 0) {
				return false;
			}
			
			//用户设置了进行垂直方向的懒加载
			if (self.config.scrollY) {
				var scrollTop = DOM.scrollTop();

				//判断元素的顶部比视口的高度加上浏览器滚动的纵坐标之和还大，证明元素在视口下方
				eleBelow = self.viewportHeight + scrollTop < elementOffset.top - threshold;

				//判断元素的底部比浏览器滚动的高度之和还小，证明元素在视口上方
				//实际使用时由下往上进行懒加载的情况应该比较少
				//eleAbove = scrollTop > elementOffset.top + $ele.height() + threshold;
			}

			//用户设置了进行水平方向的懒加载
			if (self.config.scrollX) {
				var scrollLeft = DOM.scrollLeft();

				//判断元素的左边比视口的宽度加上浏览器滚动的横坐标之和还大，证明元素在视口右方
				eleLeft = self.viewportWidth + scrollLeft < elementOffset.left - threshold;

				//判断元素的右部比浏览器滚动的横坐标还小，证明元素在视口左方
				//实际使用时由右往左进行懒加载的情况应该比较少				
				//eleRight = scrollLeft > elementOffset.left + $ele.width() + threshold;
			}

			//元素不在视口中的条件取反；懒元素不在视口中只需满足2个条件之一即可
			return !(eleBelow || eleLeft);
		}
	});

	return LazyLoad;
}, {
    requires: ["node"]
});