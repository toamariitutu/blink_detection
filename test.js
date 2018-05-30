(function () {
  // DOM
  var wrapper = document.getElementById("wrapper");
  var inner = document.getElementById("inner");

  // 顔のワイヤーフレームが表示されるcanvas
  var wireframe = document.getElementById("wireframe");
  var wireframeContext = wireframe.getContext("2d");

	var overlay = document.getElementById('wireframe');
  var overlayCC = overlay.getContext('2d');

  var targetVideo = document.getElementById('video');

  var counter = document.getElementById('blinkCount');
  var blinkCount = 0;

  // video
  var inputVideo = document.getElementById("inputVideo");

  // ログ表示用
  var log = document.getElementById("log");


	var oldLeftEye = new Array(2);
	var oldRightEye = new Array(2);
	var oldNose = new Array(2);
	
	
	var leftMode = 0;
	var leftInterval = 10;
	
	var closeFlag = false;

  // Stats
  var stats;

  // clmtrackr
  var ctrack;

  // 描画用RequestAnimationFrame
  var drawRequest;

  //ベンダープリフィックスの有無を吸収
  navigator.mediaDevices = navigator.mediaDevices || ((navigator.mozGetUserMedia || navigator.webkitGetUserMedia) ? {
    getUserMedia: function(c) {
      return new Promise(function(y, n) {
        (navigator.mozGetUserMedia ||
         navigator.webkitGetUserMedia).call(navigator, c, y, n);
      });
    }
  } : null);
 
  if (!navigator.mediaDevices) {
    console.log("getUserMedia() not supported.");
    return;
  }

  // 処理開始
  start();

  /**
   * 処理開始
   */
  function start() {
    // Stats
    stats = new Stats();
    stats.showPanel(0); // 0: fps, 1: ms, 2: mb, 3+: custom
    document.body.appendChild(stats.dom);

    eyeRect = {
      x: 0,
      y: 0,
      w: 0,
      h: 0,
    };

    // eye canvas and context
    // eyeCanvas = document.getElementById('eyeCanvas');
    // eyeContext = eyeCanvas.getContext('2d');

    // // black & white canvas and context
    // bwCanvas = document.getElementById('bwCanvas');
    // bwContext = bwCanvas.getContext('2d');


    // drowLog("Webカメラ読込中...");

    // clmtrackrをインスタンス化
    ctrack = new clm.tracker();

    var constraints = { audio: false, video: true };

    navigator.mediaDevices.getUserMedia(constraints)
    .then(function(mediaStream) {
      // videoのメタデータの取得が成功
      inputVideo.addEventListener("loadedmetadata", function (event) {
        // videoのサイズを取得
        var inputVideoW = inputVideo.clientWidth;
        var inputVideoH = inputVideo.clientHeight;
        // windowの横幅を取得
        var windowW = inner.clientWidth;
        // windowの横幅と動画の横幅の比率を算出
        var inputVideoRate = windowW / inputVideoW;

        

        // サイズを設定
        inputVideo.width = wireframe.width = windowW;
        inputVideo.height = wireframe.height = inputVideoH * inputVideoRate;

        // 繰り返し処理開始
        loop();

        // drowLog("顔検出中...");

        // 顔を検出できたときのEvent
        document.addEventListener("clmtrackrConverged", clmtrackrConvergedHandler);
        // 顔を検出できなかったときのEvent
        // document.addEventListener("clmtrackrLost", clmtrackrLostHandler);
        // 顔のモデルデータを設定
        ctrack.init(pModel);
        // 顔の検出を開始
        ctrack.start(inputVideo);
      });

      // videoでWebカメラの映像を表示
      inputVideo.srcObject = mediaStream;
    })
    .catch(function(error) {
      console.log("error", error);
    });

      
  }

  /**
   * 繰り返し処理
   */
  function loop() {
    // requestAnimationFrame
    drawRequest = requestAnimationFrame(loop);

    // Stats計測開始
    stats.begin();

    // canvasの描画をクリア
    wireframeContext.clearRect(0, 0, wireframe.width, wireframe.height);

    // 座標が取得できたかどうか
    if (ctrack.getCurrentPosition()) {
      // ワイヤーフレームを描画
      ctrack.draw(wireframe);

      // var pos = ctrack.getCurrentPosition();
      // if (pos) {
      //     eyeRect.x = pos[23][0];
      //     eyeRect.y = pos[24][1];
      //     eyeRect.w = pos[25][0] - pos[23][0];
      //     eyeRect.h = pos[26][1] - pos[24][1];

      //     // draw eye
      //     eyeContext.drawImage(wireframe, eyeRect.x, eyeRect.y, eyeRect.w, eyeRect.h, 0, 0, eyeContext.canvas.width, eyeContext.canvas.height);

      //     // black and white
      //     var data = CanvasFilters.getPixels(eyeCanvas);
      //     var grayscale = CanvasFilters.grayscale(data, settings.contrast, settings.brightness);

      //     bwContext.putImageData(grayscale, 0, 0);
      // }

      var list = ctrack.getCurrentPosition();
      if (list.length > 50) {
        
        var leftEye = list[27];
        var rightEye = list[32];
        var nose = list[37];
        
        var dxLE = leftEye[0] - oldLeftEye[0];
        var dyLE = leftEye[1] - oldLeftEye[1];
        var dLE = Math.sqrt(dxLE*dxLE+dyLE*dyLE);
        
        var dxRE = rightEye[0] - oldRightEye[0];
        var dyRE = rightEye[1] - oldRightEye[1];
        var dRE = Math.sqrt(dxRE*dxRE+dyRE*dyRE);
        
        var dxN = nose[0] - oldNose[0];
        var dyN = nose[1] - oldNose[1];
        var dN = Math.sqrt(dxN*dxN+dyN*dyN);
        
        var dyLE = leftEye[1] - oldLeftEye[1];
        var dyRE = rightEye[1] - oldRightEye[1];
        var dyN = nose[1] - oldNose[1];
        
        
        //１回検出後はすぐに検出しないようにする
        if (leftInterval < 0) {
          //目が下方向（yの+方向）にある程度動いた場合（目を閉じた）
          if (dyLE > 0.5) {
            //鼻の変化量dNより目の変化量dLEのほうが大きい
            if (dLE - dN > 0.3) {
              // if (leftMode == 0) {
              //   leftMode = 1;
              // } else {
              //   leftMode = 0;
              // }
              blinkCount += 1;
              counter.textContent = blinkCount;
              targetVideo.currentTime += 10;
              leftInterval = 10;
              // onChangeMode();
            }
          }
        }

        oldLeftEye[0] = leftEye[0];
        oldLeftEye[1] = leftEye[1];
        oldRightEye[0] = rightEye[0];
        oldRightEye[1] = rightEye[1];
        oldNose[0] = nose[0];
        oldNose[1] = nose[1];
        
        //overlayCC.beginPath();
        // overlayCC.rect(270, 200, 100, 100);
        // if (leftMode == 0) {
        //   overlayCC.fillStyle = 'rgb(255, 255, 0)';
        // } else {
        //   overlayCC.fillStyle = 'rgb(255, 0, 0)';
        // }
        // overlayCC.fill();
        
        leftInterval--;
        
      }
    }

    // Stats計測終了
    stats.end();
  }

  /**
   * 顔検出失敗
   */
  function clmtrackrLostHandler() {
    // Remove Event
    document.removeEventListener("clmtrackrLost", clmtrackrLostHandler);
    document.removeEventListener("clmtrackrConverged", clmtrackrConvergedHandler);

    drowLog("顔検出失敗");

    // 繰り返し処理停止
    cancelAnimationFrame(drawRequest);
    // 顔検出処理停止
    ctrack.stop();
  }

  /**
   * 顔検出成功
   */
  function clmtrackrConvergedHandler() {
    // Remove Event
    document.removeEventListener("clmtrackrLost", clmtrackrLostHandler);
    document.removeEventListener("clmtrackrConverged", clmtrackrConvergedHandler);

    // drowLog("顔検出成功");
  }

  /**
   * ログを表示
   * @param str
   */
  function drowLog(str) {
    log.innerHTML = str;
  }

})();