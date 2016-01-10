var theWindow = window;
if (!theWindow.TextCursor) {
	theWindow.TextCursor = function(fillStyle, width) {
		this.fillStyle = fillStyle || "rgba(0, 0, 0, 0.7)";
		this.width = width || 2;
		this.left = 0;
		this.top = 0
	};
	theWindow.TextCursor.prototype = {
		getHeight: function(context) {
			var w = context.measureText("W").width;
			return w + w / 6
		}
		,createPath: function(context) {
			context.beginPath();
			context.rect(this.left, this.top, this.width, this.getHeight(context))
		}
		,draw: function(context, left, bottom) {
			context.save();
			this.left = left;
			this.top = bottom - this.getHeight(context);
			this.createPath(context);
			context.lineWidth = 1;
			context.fillStyle = this.fillStyle;
			context.fill();
			context.restore()
		}
		,erase: function(context) {
			theWindow.NOTEPAD.restoreCanvas([this.left - 1, this.top, this.width + 2, this.getHeight(context)])
		}
	}
}
if (!theWindow.TextLine) {
	theWindow.TextLine = function(x, y) {
		this.text = "";
		this.left = x;
		this.bottom = y;
		this.caret = 0
	};
	theWindow.TextLine.prototype = {
		insert: function(text) {
			var first = this.text.slice(0, this.caret)
			,last = this.text.slice(this.caret);
			first += text;
			this.text = first;
			this.text += last;
			this.caret += text.length
		}
		,getCaretX: function(context) {
			var s = this.text.substring(0, this.caret)
			,w = context.measureText(s).width;
			return this.left + w
		}
		,removeCharacterBeforeCaret: function() {
			if (this.caret === 0) return;
			this.text = this.text.substring(0, this.caret - 1) + this.text.substring(this.caret);
			this.caret--
		}
		,removeLastCharacter: function() {
			this.text = this.text.slice(0, - 1)
		}
		,getWidth: function(context) {
			return context.measureText(this.text).width
		}
		,getHeight: function(context) {
			var h = context.measureText("W").width;
			return h + h / 6
		}
		,draw: function(context) {
			context.save();
			context.textAlign = "start";
			context.textBaseline = "bottom";
			context.lineWidth = 1;
			context.strokeText(this.text, this.left, this.bottom);
			context.fillText(this.text, this.left, this.bottom);
			context.restore()
		}
		,erase: function(context) {
			theWindow.NOTEPAD.restoreCanvas()
		}
	}
}
if (!theWindow.Paragraph) {
	theWindow.Paragraph = function(context, left, top, imageData, cursor) {
		this.context = context;
		this.drawingSurface = imageData;
		this.left = left;
		this.top = top;
		this.lines = [];
		this.activeLine = undefined;
		this.cursor = cursor;
		this.blinkingInterval = undefined
	};
	theWindow.Paragraph.prototype = {
		clearIntervals: function(callback) {
			this.blinkingInterval = theWindow.clearInterval(this.blinkingInterval);
			this.blinkingTimeout = theWindow.clearTimeout(this.blinkingTimeout);
			this.cursor.erase(this.context, this.drawingSurface);
			if (typeof callback === "function" && ! this.blinkingInterval) {
				callback()
			} else if (this.blinkingInterval) {
				this.clearIntervals(callback)
			}
		}
		,isPointInside: function(loc) {
			var c = this.context;
			c.beginPath();
			c.rect(this.left, this.top, this.getWidth(), this.getHeight());
			return c.isPointInPath(loc.x, loc.y)
		}
		,getHeight: function() {
			var h = 0;
			this.lines.forEach(Function.prototype.bind.call(function(line) {
				h += line.getHeight(this.context)
			}, this));
			return h
		}
		,getWidth: function() {
			var w = 0,
			widest = 0;
			this.lines.forEach(Function.prototype.bind.call(function(line) {
				w = line.getWidth(this.context);
				if (w > widest) {
					widest = w
				}
			}, this));
			return widest
		}
		,draw: function() {
			this.lines.forEach(Function.prototype.bind.call(function(line) {
				line.draw(this.context)
			}, this))
		}
		,erase: function(context) {
			theWindow.NOTEPAD.restoreCanvas()
		}
		,addLine: function(line) {
			this.lines.push(line);
			this.activeLine = line;
			this.moveCursor(line.left, line.bottom)
		}
		,insert: function(text) {
			this.erase(this.context, this.drawingSurface);
			this.activeLine.insert(text);
			var t = this.activeLine.text.substring(0, this.activeLine.caret)
			,w = this.context.measureText(t).width;
			this.moveCursor(this.activeLine.left + w, this.activeLine.bottom);
			this.draw(this.context)
		}
		,blinkCursor: function(x, y) {
			var self = this,
			BLINK_OUT = 200,
			BLINK_INTERVAL = 900;
			if (this.blinkingInterval) {
				this.blinkingInterval = theWindow.clearInterval(this.blinkingInterval)
			}
			this.blinkingInterval = setInterval(function(e) {
				var drawMethod = theWindow.NOTEPAD.drawOptions[theWindow.NOTEPAD.selectedDrawOption];
				if (!drawMethod || drawMethod.type !== "text") {
					self.blinkingInterval = theWindow.clearInterval(self.blinkingInterval);
					return
				}
				self.cursor.erase(self.context, self.drawingSurface);
				if (self.blinkingTimeout) {
					self.blinkingTimeout = theWindow.clearTimeout(self.blinkingTimeout)
				}
				self.blinkingTimeout = setTimeout(function(e) {
					self.cursor.draw(self.context, self.cursor.left, self.cursor.top + self.cursor.getHeight(self.context))
				}, BLINK_OUT)
			}, BLINK_INTERVAL)
		}
		,moveCursorCloseTo: function(x, y) {
			var line = this.getLine(y);
			if (line) {
				line.caret = this.getColumn(line, x);
				this.activeLine = line;
				this.moveCursor(line.getCaretX(this.context), line.bottom)
			}
		}
		,moveCursor: function(x, y) {
			this.cursor.erase(this.context, this.drawingSurface);
			this.cursor.draw(this.context, x, y);
			if (!this.blinkingInterval) this.blinkCursor(x, y)
		}
		,moveLinesDown: function(start) {
			for (var i = start; i < this.lines.length; ++i) {
				var line = this.lines[i];
				line.bottom += line.getHeight(this.context)
			}
		}
		,newline: function() {
			var textBeforeCursor = this.activeLine.text.substring(0, this.activeLine.caret)
			,textAfterCursor = this.activeLine.text.substring(this.activeLine.caret)
			,height = this.context.measureText("W").width + this.context.measureText("W").width / 6
			,bottom = this.activeLine.bottom + height
			,activeIndex
			,line;
			this.erase(this.context, this.drawingSurface);
			this.activeLine.text = textBeforeCursor;
			line = new TextLine(this.activeLine.left, bottom);
			line.insert(textAfterCursor);
			activeIndex = this.lines.indexOf(this.activeLine);
			this.lines.splice(activeIndex + 1, 0, line);
			this.activeLine = line;
			this.activeLine.caret = 0;
			activeIndex = this.lines.indexOf(this.activeLine);
			for (var i = activeIndex + 1; i < this.lines.length; ++i) {
				line = this.lines[i];
				line.bottom += height
			}
			this.draw();
			this.cursor.draw(this.context, this.activeLine.left, this.activeLine.bottom)
		}
		,getLine: function(y) {
			var line;
			for (var i = 0; i < this.lines.length; ++i) {
				line = this.lines[i];
				if (y > line.bottom - line.getHeight(this.context) && y < line.bottom) {
					return line
				}
			}
			return undefined
		}
		,getColumn: function(line, x) {
			var found = false,
			before, after, closest, tmpLine, column;
			tmpLine = new TextLine(line.left, line.bottom);
			tmpLine.insert(line.text);
			while (!found && tmpLine.text.length > 0) {
				before = tmpLine.left + tmpLine.getWidth(this.context);
				tmpLine.removeLastCharacter();
				after = tmpLine.left + tmpLine.getWidth(this.context);
				if (after < x) {
					closest = x - after < before - x ? after: before;
					column = closest === before ? tmpLine.text.length + 1: tmpLine.text.length;
					found = true
				}
			}
			return column
		}
		,activeLineIsOutOfText: function() {
			return this.activeLine.text.length === 0
		}
		,activeLineIsTopLine: function() {
			return this.lines[0] === this.activeLine
		}
		,moveUpOneLine: function() {
			var lastActiveText, line, before, after;
			var lastActiveLine = this.activeLine;
			lastActiveText = "" + lastActiveLine.text;
			var activeIndex = this.lines.indexOf(this.activeLine);
			this.activeLine = this.lines[activeIndex - 1];
			this.activeLine.caret = this.activeLine.text.length;
			this.lines.splice(activeIndex, 1);
			this.moveCursor(this.activeLine.left + this.activeLine.getWidth(this.context), this.activeLine.bottom);
			this.activeLine.text += lastActiveText;
			for (var i = activeIndex; i < this.lines.length; ++i) {
				line = this.lines[i];
				line.bottom -= line.getHeight(this.context)
			}
		}
		,backspace: function() {
			var lastActiveLine, activeIndex, t, w;
			this.context.save();
			if (this.activeLine.caret === 0) {
				if (!this.activeLineIsTopLine()) {
					this.erase(this.context, this.drawingSurface);
					this.moveUpOneLine();
					this.draw()
				}
			} else {
				this.erase(this.context, this.drawingSurface);
				this.activeLine.removeCharacterBeforeCaret();
				t = this.activeLine.text.slice(0, this.activeLine.caret);
				w = this.context.measureText(t).width;
				this.moveCursor(this.activeLine.left + w, this.activeLine.bottom);
				this.draw(this.context);
				this.context.restore()
			}
		}
	}
}
if (!Function.prototype.bind) {
	Function.prototype.bind = function(oThis) {
		if (typeof this !== "function") {
			throw new TypeError("Function.prototype.bind - what is trying to be bound is not callable")
		}
		var aArgs = Array.prototype.slice.call(arguments, 1)
		,fToBind = this
		,fNOP = function() {}
		,fBound = function() {
			return fToBind.apply(this instanceof fNOP && oThis ? this: oThis, aArgs.concat(Array.prototype.slice.call(arguments)))
		};
		fNOP.prototype = this.prototype;
		fBound.prototype = new fNOP;
		return fBound
	}
} (function(window, factory) {
	if (typeof chrome !== "undefined") {
		if (typeof window.NOTEPAD !== "undefined" && window.NOTEPAD !== null) {} else {
			window.NOTEPAD = factory(window)
		}
		if (!window.NOTEPAD.initialized) {
			window.NOTEPAD.init()
		}
	} else if (typeof unsafeWindow !== "undefined" && unsafeWindow !== null) {
		if (unsafeWindow.NOTEPAD_INIT) {} else {
			window.NOTEPAD = factory(window);
			window.NOTEPAD.init()
		}
	}
})(typeof theWindow !== "undefined" ? theWindow: this, function(window) {
	var wrapper = {
		canvas: null
		,context: null
		,initialized: false
		,drawOptions: [{
			type: "pen"
		}, {
			type: "text"
			,font: "30px DejaVu Sans YuanTi Mono"
		}, {
			type: "line"
		}, {
			type: "polygon"
		}, {
			type: "circle"
		}, {
			type: "rectangle"
		}, {
			type: "cursor"
		}, {
			type: "eraser"
			,width: 30
			,height: 30
		}]
		,selectedDrawOption: null
		,selectedColorOption: null
		,selectedAlphaOption: null
		,mousedown: false
		,lastMouseDownLoc: null
		,drawingSurfaceImageData: null
		,resizeTimeoutID: null
		,cursor: new TextCursor
		,paragraph: null
		,panel: null
		,maxHight: null
		,createCanvas: function() {
			this.canvas = window.document.createElement("canvas");
			//this.canvas = window.document.getElementById('NOTEPAD');
			this.context = this.canvas.getContext("2d");
			this.canvas.setAttribute("id", "NOTEPAD");
			this.buffer = document.createElement("canvas");
			window.document.body.appendChild(this.canvas);
			window.addEventListener("resize", this.resizeBinded);
			window.addEventListener("scroll", this.resizeBinded);
			window.dispatchEvent(new Event("resize"))
		}
		,storeCanvas: function() {
			this.buffer.width = this.canvas.width;
			this.buffer.height = this.canvas.height;
			this.buffer.getContext("2d").drawImage(this.canvas, 0, 0)
		}
		,restoreCanvas: function(args) {
			if (args) {
				this.context.clearRect.apply(this.context, args);
				args.unshift(this.buffer);
				this.context.drawImage.apply(this.context, args)
			} else {
				this.context.clearRect(0, 0, this.canvas.width, this.canvas.height);
				this.context.drawImage(this.buffer, 0, 0)
			}
		}
		,handleResize: function() {
			this.storeCanvas();
			var lineWidth = this.context.lineWidth,
			docWidth = Math.max(document.documentElement["clientWidth"], document.body["scrollWidth"], document.documentElement["scrollWidth"], document.body["offsetWidth"], document.documentElement["offsetWidth"])
			,docHeight = Math.max(document.documentElement["clientHeight"], document.body["scrollHeight"], document.documentElement["scrollHeight"], document.body["offsetHeight"], document.documentElement["offsetHeight"]);
            
			var baowdraw = document.getElementById('baow-paint-new');
            if (baowdraw){
                //baowdraw.style.top  = window.scrollY  + "px";baowdraw.style.top
                var focus = document.getElementById('baow-focus').checked;
                if (focus){
                    var newTop = window.scrollY + 50;
                    baowdraw.style.top = newTop + 'px';
                }

                var ttt = baowdraw.style.top;
                var t2 = ttt.split('px');
                var newtop = parseInt(t2[0]) + 15;
                this.canvas.style.top  = newtop + "px";
                //alert(this.canvas.style.top);
                //

                var ttt3 = baowdraw.style.left;
                var ll = ttt3.split('px');
                var newleft = parseInt(ll[0]) ;
                //alert(newleft);
                this.canvas.style.left  = newleft+"px";


                var ww = parseInt(baowdraw.style.width);
                this.canvas.width = ww-50;


                var check = document.getElementById('baow-checkbox');
                var focus = document.getElementById('baow-focus');
                if (check.checked==true){
                    var ttt = baowdraw.style.top;
                    var t2 = ttt.split('px');
                    var top = parseInt(t2[0]);

                    var nh = window.scrollY + 14 - top + window.innerHeight-25;
                    var nh2;
                    if (this.maxHight && this.maxHight > nh){
                        nh2 = this.maxHight;
                    }else{
                        nh2 = nh;
                        this.maxHight = nh;
                    } 
                    baowdraw.style.height = nh2 + "px";
                    this.canvas.height = nh2-16;

                    var footer = document.getElementById('baow-footer');
                    nh = window.scrollY + 14 - top + 100;
                    footer.style.marginTop  = nh + "px";


                }else{

                    var hh = baowdraw.style.height;
                    var ll = hh.split('px');
                    var nh = ll[0]-13;
                    this.canvas.height = nh;
                }


            }else{
                var y = window.scrollY + 14;
                this.canvas.style.top  = y  + "px";
                this.canvas.style.left  = "81px";
                this.canvas.width = 870;
                this.canvas.height = 550;
            }
			//this.canvas.width = docWidth;
			//this.canvas.height = docHeight;
			this.restoreCanvas();
			this.updatePaintStyle();
			this.context.lineWidth = lineWidth

		}
		,createControlPanel: function() {
			this.panel = window.document.createElement("div");
			var drawPanel = window.document.createElement("div")
			,colorPanel = window.document.createElement("div")
			,controlPanel = window.document.createElement("div")
			,alphaPanel = window.document.createElement("div")
			,linePanel = window.document.createElement("div");
			this.panel.setAttribute("id", "NOTEPAD_controls");
			drawPanel.setAttribute("class", "NOTEPAD_controls_draw");
			colorPanel.setAttribute("class", "NOTEPAD_controls_color");
			controlPanel.setAttribute("class", "NOTEPAD_controls_control");
			alphaPanel.setAttribute("class", "NOTEPAD_controls_range");
			linePanel.setAttribute("class", "NOTEPAD_controls_range");
			window.document.body.appendChild(this.panel);
			this.panel.appendChild(drawPanel);
			this.panel.appendChild(colorPanel);
			this.panel.appendChild(alphaPanel);
			this.panel.appendChild(linePanel);
			this.panel.appendChild(controlPanel);
			for (var i = 0; i < this.drawOptions.length; i++) {
				var item = this.drawOptions[i];
				var box = window.document.createElement("div");
				box.setAttribute("class", "NOTEPAD_controls_draw_option");
				this.addClass(box, item.type);
				box.addEventListener("click", Function.prototype.bind.call(this.onControlPanelClick, this, i));
				drawPanel.appendChild(box);
				if (i === 0) {
					this.triggerClick(box)
				}
			}
			var colorPicker = window.document.createElement("input");
			colorPicker.setAttribute("type", "color");
			colorPicker.setAttribute("value", "#F40000");
			colorPanel.setAttribute("data-tip", "Select Color");
			colorPicker.addEventListener("change", Function.prototype.bind.call(this.onColorPanelClick, this), false);
			colorPanel.appendChild(colorPicker);
			var alphaPicker = window.document.createElement("input");
			alphaPicker.setAttribute("type", "range");
			alphaPicker.setAttribute("min", "0");
			alphaPicker.setAttribute("max", "1");
			alphaPicker.setAttribute("step", "0.01");
			alphaPicker.setAttribute("value", "1");
			alphaPanel.setAttribute("data-tip", "Select Transparency");
			alphaPicker.addEventListener("change", Function.prototype.bind.call(this.onAlphaChange, this), false);
			alphaPanel.appendChild(alphaPicker);
			var linePicker = window.document.createElement("input");
			linePicker.setAttribute("type", "range");
			linePicker.setAttribute("min", "1");
			linePicker.setAttribute("max", "10");
			linePicker.setAttribute("step", "1");
			linePicker.setAttribute("value", "1");
			linePanel.setAttribute("data-tip", "Select Line Width");
			linePicker.addEventListener("change", Function.prototype.bind.call(this.onLineChange, this), false);
			linePanel.appendChild(linePicker);
			this.selectedColorOption = this.hexToRgb(colorPicker.value);
			this.selectedAlphaOption = alphaPicker.value;
			this.context.lineWidth = linePicker.value;
			this.updatePaintStyle();
			var prtBtn = window.document.createElement("div")
			,exitBtn = window.document.createElement("div");
			prtBtn.setAttribute("class", "NOTEPAD_controls_control_option prtBtn");
			exitBtn.setAttribute("class", "NOTEPAD_controls_control_option exitBtn");
			prtBtn.addEventListener("click", Function.prototype.bind.call(this.onPrintButtonClick, this));
			exitBtn.addEventListener("click", Function.prototype.bind.call(this.exit, this));
			controlPanel.appendChild(prtBtn);
			controlPanel.appendChild(exitBtn)
		}
		,onPrintButtonClick: function() {
			this.panel.style.display = "none";
			window.setTimeout(function() {
				if (typeof chrome !== "undefined") {
					chrome.runtime.sendMessage({
						method: "take_screen_shot"
					})
				} else {
					self.port.emit("take_screen_shot")
				}
			}, 100);
			window.setTimeout(Function.prototype.bind.call(function() {
				this.panel.style.display = "block"
			}, this), 500)
		}
		,onControlPanelClick: function(index, e) {
			if (this.selectedDrawOption === index) {
				return
			}
			var boxes = window.document.querySelectorAll("#NOTEPAD_controls .NOTEPAD_controls_draw_option")
			,drawMethed = this.drawOptions[this.selectedDrawOption];
			if (drawMethed && drawMethed.type === "polygon" && drawMethed.lastLoc && drawMethed.initLoc) {
				this.context.beginPath();
				this.context.moveTo(drawMethed.lastLoc.x, drawMethed.lastLoc.y);
				this.context.lineTo(drawMethed.initLoc.x, drawMethed.initLoc.y);
				this.context.stroke();
				this.context.closePath();
				drawMethed.lastLoc = null
			}
			for (var i = 0; i < boxes.length; i++) {
				this.removeClass(boxes[i], "selected")
			}
			this.addClass(boxes[index], "selected");
			this.removeClass(this.canvas, "pen");
			this.removeClass(this.canvas, "cross");
			this.removeClass(this.canvas, "eraser");
			this.removeClass(this.canvas, "text");
			this.removeClass(this.canvas, "cursor");
			this.selectedDrawOption = index;
			drawMethed = this.drawOptions[this.selectedDrawOption];
			if (drawMethed.type === "pen") {
				this.addClass(this.canvas, "pen")
			} else if (drawMethed.type === "eraser") {
				this.addClass(this.canvas, "eraser")
			} else if (drawMethed.type === "text") {
				this.addClass(this.canvas, "text")
			} else if (drawMethed.type === "cursor") {
				this.addClass(this.canvas, "cursor")
			} else {
				this.addClass(this.canvas, "cross")
			}
			if (this.paragraph) {
				this.paragraph.clearIntervals(Function.prototype.bind.call(function() {
					this.paragraph = null;
					this.storeCanvas()
				}, this))
			}
			this.storeCanvas()
		}
		,hexToRgb: function(hex) {
			var result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
			return result ? {
				r: parseInt(result[1], 16)
				,g: parseInt(result[2], 16)
				,b: parseInt(result[3], 16)
			}: null
		}
		,onColorPanelClick: function(e) {
			this.selectedColorOption = this.hexToRgb(e.currentTarget.value);
			this.updatePaintStyle()
		}
		,onAlphaChange: function(e) {
			this.selectedAlphaOption = e.currentTarget.value;
			this.updatePaintStyle()
		}
		,onLineChange: function(e) {
			this.context.lineWidth = e.currentTarget.value
		}
		,updatePaintStyle: function() {
			if (this.selectedColorOption === null || this.selectedAlphaOption === null) {
				return
			}
			this.cursor.fillStyle = "rgba(" + this.selectedColorOption.r + "," + this.selectedColorOption.g + "," + this.selectedColorOption.b + "," + this.selectedAlphaOption + ")";
			this.context.strokeStyle = "rgba(" + this.selectedColorOption.r + "," + this.selectedColorOption.g + "," + this.selectedColorOption.b + "," + this.selectedAlphaOption + ")";
			this.context.fillStyle = "rgba(" + this.selectedColorOption.r + "," + this.selectedColorOption.g + "," + this.selectedColorOption.b + "," + this.selectedAlphaOption + ")"
		}
		,addMouseEventListener: function() {
			this.canvas.addEventListener("mousedown", Function.prototype.bind.call(this.handleMouseDown, this));
			this.canvas.addEventListener("mousemove", Function.prototype.bind.call(this.handleMouseMove, this));
			this.canvas.addEventListener("mouseup", Function.prototype.bind.call(this.handleMouseUp, this));
			this.canvas.addEventListener("mouseleave", Function.prototype.bind.call(this.handleMouseLeave, this));
			window.document.addEventListener("keydown", this.keydownBinded);
			window.document.addEventListener("keypress", this.keypressBinded)
		}
		,handleKeyDown: function(e) {
			if (!this.paragraph) {
				return
			}
			if (e.keyCode === 8 || e.keyCode === 13) {
				e.preventDefault()
			}
			if (e.keyCode === 8) {
				this.paragraph.backspace()
			} else if (e.keyCode === 13) {
				this.paragraph.newline()
			}
		}
		,handleKeyPress: function(e) {
			if (!this.paragraph) {
				return
			}
			var key = String.fromCharCode(e.which);
			if (e.keyCode !== 8 && ! e.ctrlKey && ! e.metaKey) {
				e.preventDefault();
				this.context.font = this.drawOptions[this.selectedDrawOption].font;
				this.paragraph.insert(key)
			}
		}
		,handleMouseDown: function(e) {
			this.mousedown = true;
			var drawMethed = this.drawOptions[this.selectedDrawOption];
			this.lastMouseDownLoc = this.windowToCanvas(e.clientX, e.clientY);
			if (drawMethed.type === "pen") {
				this.context.beginPath();
				this.context.moveTo(this.lastMouseDownLoc.x, this.lastMouseDownLoc.y + 16)
			} else if (drawMethed.type === "line") {
				this.storeCanvas()
			} else if (drawMethed.type === "polygon") {
				this.storeCanvas();
				if (!drawMethed.lastLoc) {
					drawMethed.lastLoc = {
						x: this.lastMouseDownLoc.x
						,y: this.lastMouseDownLoc.y
					};
					drawMethed.initLoc = {
						x: this.lastMouseDownLoc.x
						,y: this.lastMouseDownLoc.y
					}
				} else {
					this.context.beginPath();
					this.context.moveTo(drawMethed.lastLoc.x, drawMethed.lastLoc.y);
					this.context.lineTo(this.lastMouseDownLoc.x, this.lastMouseDownLoc.y);
					this.context.stroke()
				}
			} else if (drawMethed.type === "circle") {
				this.storeCanvas()
			} else if (drawMethed.type === "rectangle") {
				this.storeCanvas()
			} else if (drawMethed.type === "eraser") {
				this.restoreCanvas();
				this.context.save();
				this.context.translate(this.lastMouseDownLoc.x, this.lastMouseDownLoc.y);
				this.context.clearRect(0, 0, drawMethed.width, drawMethed.height);
				this.context.restore()
			} else if (drawMethed.type === "text") {
				this.cursor.erase(this.context, this.drawingSurfaceImageData);
				this.storeCanvas();
				if (this.paragraph && this.paragraph.isPointInside(this.lastMouseDownLoc)) {
					this.paragraph.moveCursorCloseTo(this.lastMouseDownLoc.x, this.lastMouseDownLoc.y)
				} else {
					if (this.paragraph) {
						this.paragraph.clearIntervals();
						this.paragraph = null
					}
					var fontHeight = this.context.measureText("W").width;
					fontHeight += fontHeight / 6;
					this.paragraph = new Paragraph(this.context, this.lastMouseDownLoc.x, this.lastMouseDownLoc.y - fontHeight, this.drawingSurfaceImageData, this.cursor);
					this.paragraph.addLine(new TextLine(this.lastMouseDownLoc.x, this.lastMouseDownLoc.y))
				}
			}
		}
		,handleMouseMove: function(e) {
			var drawMethed = this.drawOptions[this.selectedDrawOption]
			,loc = this.windowToCanvas(e.clientX, e.clientY);
			if (!this.mousedown && drawMethed.type === "eraser") {
				this.restoreCanvas();
				this.context.save();
				this.context.translate(loc.x, loc.y);
				this.context.clearRect(0, 0, drawMethed.width, drawMethed.height);
				this.context.restore()
			}
			if (this.mousedown) {
				if (drawMethed.type === "pen") {
					this.context.lineTo(loc.x, loc.y + 16);
					this.context.stroke()
				} else if (drawMethed.type === "line") {
					this.restoreCanvas();
					this.context.beginPath();
					this.context.moveTo(this.lastMouseDownLoc.x, this.lastMouseDownLoc.y);
					this.context.lineTo(loc.x, loc.y);
					this.context.stroke()
				} else if (drawMethed.type === "polygon") {
					this.restoreCanvas();
					this.context.beginPath();
					this.context.moveTo(drawMethed.lastLoc.x, drawMethed.lastLoc.y);
					this.context.lineTo(loc.x, loc.y);
					this.context.stroke()
				} else if (drawMethed.type === "circle") {
					this.restoreCanvas();
					this.drawEllipse(this.lastMouseDownLoc.x, this.lastMouseDownLoc.y, loc.x - this.lastMouseDownLoc.x, loc.y - this.lastMouseDownLoc.y)
				} else if (drawMethed.type === "rectangle") {
					this.restoreCanvas();
					this.context.beginPath();
					this.context.moveTo(this.lastMouseDownLoc.x, this.lastMouseDownLoc.y);
					this.context.lineTo(this.lastMouseDownLoc.x, loc.y);
					this.context.lineTo(loc.x, loc.y);
					this.context.lineTo(loc.x, this.lastMouseDownLoc.y);
					this.context.lineTo(this.lastMouseDownLoc.x, this.lastMouseDownLoc.y);
					this.context.stroke()
				} else if (drawMethed.type === "eraser") {
					this.context.save();
					this.context.translate(loc.x, loc.y);
					this.context.clearRect(0, 0, drawMethed.width, drawMethed.height);
					this.context.restore()
				}
			}
		}
		,handleMouseUp: function(e) {
			this.mousedown = false;
			var drawMethed = this.drawOptions[this.selectedDrawOption]
			,loc = this.windowToCanvas(e.clientX, e.clientY);
			if (drawMethed.type === "pen") {
				this.storeCanvas();
				this.context.closePath()
			} else if (drawMethed.type === "line") {
				this.storeCanvas();
				this.context.closePath()
			} else if (drawMethed.type === "polygon") {
				this.storeCanvas();
				drawMethed.lastLoc = {
					x: loc.x
					,y: loc.y
				}
			} else if (drawMethed.type === "circle") {
				this.storeCanvas()
			} else if (drawMethed.type === "rectangle") {
				this.storeCanvas();
				this.context.closePath()
			} else if (drawMethed.type === "eraser") {
				this.storeCanvas()
			}
		}
		,handleMouseLeave: function() {
			var drawMethed = this.drawOptions[this.selectedDrawOption];
			if (drawMethed.type === "eraser") {
				this.restoreCanvas()
			}
		}
		,drawEllipse: function(x, y, w, h) {
			var kappa = .5522848,
			ox = w / 2 * kappa,
			oy = h / 2 * kappa,
			xe = x + w,
			ye = y + h,
			xm = x + w / 2,
			ym = y + h / 2;
			this.context.beginPath();
			this.context.moveTo(x, ym);
			this.context.bezierCurveTo(x, ym - oy, xm - ox, y, xm, y);
			this.context.bezierCurveTo(xm + ox, y, xe, ym - oy, xe, ym);
			this.context.bezierCurveTo(xe, ym + oy, xm + ox, ye, xm, ye);
			this.context.bezierCurveTo(xm - ox, ye, x, ym + oy, x, ym);
			this.context.stroke()
		}
		,addClass: function(element, className) {
			element.className = element.className + " " + className
		}
		,removeClass: function(element, className) {
			element.className = element.className.replace(new RegExp("\\b" + className + "\\b"), "")
		}
		,triggerClick: function(node) {
			if (window.document.createEvent) {
				var evt = window.document.createEvent("MouseEvents");
				evt.initEvent("click", true, false);
				node.dispatchEvent(evt)
			} else if (window.document.createEventObject) {
				node.fireEvent("onclick")
			} else if (typeof node.onclick == "function") {
				node.onclick()
			}
		}
		,initDragging: function() {
			this.panel.addEventListener("mousedown", function(e) {
				wrapper.pos_x = this.getBoundingClientRect().left - e.clientX;
				wrapper.pos_y = this.getBoundingClientRect().top - e.clientY;
				this.addEventListener("mousemove", wrapper.handleDragging)
			});
			window.document.addEventListener("mouseup", this.handleDragDone)
		}
		,handleDragging: function(e) {
			if (e.target.nodeName === "INPUT") {
				return
			}
			this.style.top = e.clientY + wrapper.pos_y + "px";
			this.style.left = e.clientX + wrapper.pos_x + "px"
		}
		,handleDragDone: function(e) {
			wrapper.panel.removeEventListener("mousemove", wrapper.handleDragging)
		}
		,windowToCanvas: function(x, y) {
			var bbox = this.canvas.getBoundingClientRect();
			return {
				x: x - bbox.left * (this.canvas.width / bbox.width)
				,y: y - bbox.top * (this.canvas.height / bbox.height)
			}
		}
		,exit: function() {
			this.canvas.parentNode.removeChild(this.canvas);
			this.panel.parentNode.removeChild(this.panel);
			window.document.removeEventListener("keydown", this.keydownBinded);
			window.document.removeEventListener("keypress", this.keypressBinded);
			window.document.removeEventListener("mouseup", this.handleDragDone);
			window.removeEventListener("resize", this.resizeBinded);
			window.removeEventListener("scroll", this.resizeBinded);
			this.canvas = null;
			this.context = null;
			this.selectedDrawOption = null;
			this.selectedColorOption = null;
			this.selectedAlphaOption = null;
			this.mousedown = false;
			this.lastMouseDownLoc = null;
			this.drawingSurfaceImageData = null;
			this.paragraph = null;
			this.panel = null;
			this.initialized = false;
			if (typeof unsafeWindow !== "undefined" && unsafeWindow !== null) {
				unsafeWindow.NOTEPAD_INIT = false
			}
		}
		,init: function() {
			this.keydownBinded = Function.prototype.bind.call(this.handleKeyDown, this);
			this.keypressBinded = Function.prototype.bind.call(this.handleKeyPress, this);
			this.resizeBinded = Function.prototype.bind.call(function() {
				if (this.resizeTimeoutID) {
					this.resizeTimeoutID = window.clearTimeout(this.resizeTimeoutID)
				}
				this.resizeTimeoutID = window.setTimeout(Function.prototype.bind.call(this.handleResize, this), 200)
			}, this);
			this.createCanvas();
			this.createControlPanel();
			this.initDragging();
			this.addMouseEventListener();
			this.initialized = true;
			if (typeof unsafeWindow !== "undefined" && unsafeWindow !== null) {
				unsafeWindow.NOTEPAD_INIT = true
			}
		}
	};
	return wrapper
});
