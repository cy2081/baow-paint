(function(){
    var text = "#controls{position:absolute;top:-100px;left:2px;background-color:#f1f1f1;border:1px solid #eee;border-radius:8px;box-shadow:0 6px 10px rgba(0,0,0,0.3);padding:3px;-webkit-animation:movedown 1s;-webkit-animation-fill-mode:forwards;animation:movedown 1s;animation-fill-mode:forwards;}#controls .option{width:70px;height:30px;text-align:center;line-height:30px;font-size:13px;background-color:#fff;border-radius:5px;cursor:pointer;display:inline-block;margin-right:2px;color:#000;text-decoration:none;}#controls #close{background:url(data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAADAAAAAwCAYAAABXAvmHAAADkElEQVR42u2XS08TURTHWxIgPPuiAWOhtJ0oCU34Ai4woaxEAZW4MX4A49aNazdujR/AuDGI+MCVECXRL2CCiZjSQqkGKLUt71cYf7dpCdQ+6EzTG5M5m5m2N53/79z/PeeM2fSfh1m2AANAtgADQLYAA0C2AANAtgADQLYAA6ASf2Kz2SypVOppS0vLE65zxdZaLBb/1tbWI673/xDSAZxOpyWRSIy7XK7A6urqQmNj41A8Hv+Rb63D4ejZ2dmZ6ujo8C0vL88CfisWi+mC0AWAeEcymXzV3d3dT/bNBwcHpmAwGG1ubg6sr6+fgciIn/b5fK7a2lp1e3vbvLi4+IWduAlErOoAbW1tVuwyKcQj2GQmxPdAqAsEOzHCTsxlxPsR/wbxSl1dnUklxHqspALxFYgbMCSqBsADrWRw3OPxBIR4Qs0CCHFAmEOhUJBdGRLfbW5uTnm9Xl99ff3Jmux6IEys/dTa2nqLI1E2hCaAmpqa511dXXfxcME1h4eHwk6/hE4yfxHbFFyLDU1LS0vjx8fHd6oCQGZ7EPgWYZfJ6pmMnr7f399P35+2Te4acW5wXIg1o1jyW1UARJB9ZXd3dwYINw/PK67UfUb8b87LIOfluxYduqqQ3W5XOJwfgLgkslxOCPF4P4z461rF6wYQwU70sBMl7ZRjG1WIb2hoGEV82bapKIAI+oFCpTmXnbK24RwNrq2tac58pQF6KYcfAbhQrNqIyABEKJsDAASlA3AO+rDQJOK9xapNbnUC4mdTU9NwobGjKgB02F4O8XualCdfkyp2L5odEPM0wmuMHZp3QjMAme8l8+eyTaHI2omdGGAnNEFobWR9R0dHJW0jqo34WKLZCYh51gzTyMq2k9ZR4qXb7R6jhJaqNlE+mhRFSU+g+QBEMAOpkUjkBaPEvaoAWK1WG1VnAu9fZfv/+T3TpBbwd3qYY216mMvX7MQwFw6HZ9jVMd4rklUBEME4bdvY2HjHOH1FQOSO0zSpETKbHqfZKf/e3t6ZcVo8OzNOz5KQUcbpssXrAshAOIF4LSDI9oltGA8CueWRQ59+ocnaCfHiheYz4m8jPq5Vg+4+AISdcXiis7Ozf2VlRWR+iMznPYwCgso11d7e7otGo9OIH6OEpvQ8vyKdGCF2duIZVnrMSFH0pR6v+3kZesj1AVVHl/iKAcgMA0B2GACywwCQHQaA7DAAZIcBIDv+Aj5kTU+gFpU3AAAAAElFTkSuQmCC);width:30px;height:30px;cursor:pointer;display:inline-block;background-size:95%;background-repeat:no-repeat;vertical-align:middle}@keyframes movedown{from{top:-100px}to{top:2px}}@-webkit-keyframes movedown{from{top:-100px}to{top:2px}}";
    var css = document.createElement("style");
    css.type = "text/css";
    css.innerHTML = text;
    document.getElementsByTagName("head")[0].appendChild(css);

    var img = document.getElementById('target'),
        printBtn = document.getElementById('print'),
        close = document.getElementById('close'),
        controls = document.getElementById('controls');

    printBtn.addEventListener("click", function(){
        controls.style.display = "none";
        window.print();
        controls.style.display = "block";
    });

    close.addEventListener("click", function(){
        controls.style.display = "none";
    });
})();

