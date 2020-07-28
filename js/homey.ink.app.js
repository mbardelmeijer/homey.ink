var CLIENT_ID = '5cbb504da1fc782009f52e46';
var CLIENT_SECRET = 'gvhs0gebgir8vz8yo2l0jfb49u9xzzhrkuo1uvs8';

window.addEventListener('load', function () {
    var homey;
    var me;

    var $textLarge = document.getElementById('text-large');
    var $textSmall = document.getElementById('text-small');
    var $weatherTemperature = document.getElementById('weather-temperature');
    var $weatherState = document.getElementById('weather-state');
    var $flowsInner = document.getElementById('flows-inner');
    var $devicesInner = document.getElementById('devices-inner');

    FastClick.attach(document.body);

    document.getElementById('header').addEventListener('click', function () {
        window.location.reload();
    });

    renderText();
    later.setInterval(function () {
        renderText();
    }, later.parse.text('every 1 hour'));

    var api = new AthomCloudAPI({
        clientId: CLIENT_ID,
        clientSecret: CLIENT_SECRET,
    });

    var theme = getQueryVariable('theme') || 'web';
    var $css = document.createElement('link');
    $css.rel = 'stylesheet';
    $css.type = 'text/css';
    $css.href = './css/themes/' + theme + '.css';
    document.head.appendChild($css);

    document.getElementById('login').onclick = function () {
        var askedToken = prompt('What is your token?');

        if (askedToken) {
            localStorage.setItem('token', decodeURIComponent(askedToken));

            window.location.reload();
        }
    };

    var token = getQueryVariable('token') || localStorage.getItem('token');
    if (!token) {
        document.getElementById('login').style.display = 'block';
        return;
    }

    if (token) {
        token = atob(token);
        token = JSON.parse(token);
        api.setToken(token);
    }

    api.isLoggedIn().then(function (loggedIn) {
        if (!loggedIn) {
            localStorage.removeItem('token');

            alert('Token Expired. Please log-in again.');

            throw new Error();
        }
    }).then(function () {
        return api.getAuthenticatedUser();
    }).then(function (user) {
        return user.getFirstHomey();
    }).then(function (homey) {
        return homey.authenticate();
    }).then(function (homey_) {
        homey = homey_;

        renderHomey();

        later.setInterval(function () {
            renderHomey();
        }, later.parse.text('every 1 hour'));
    }).catch(console.error);

    function renderHomey() {
        homey.users.getUserMe().then(function (user) {
            me = user;
            me.properties = me.properties || {};
            me.properties.favoriteFlows = me.properties.favoriteFlows || [];
            me.properties.favoriteDevices = me.properties.favoriteDevices || [];

            homey.weather.getWeather().then(function (weather) {
                return renderWeather(weather);
            }).catch(console.error);

            homey.flow.getFlows().then(function (flows) {
                var favoriteFlows = me.properties.favoriteFlows.map(function (flowId) {
                    return flows[flowId];
                }).filter(function (flow) {
                    return !!flow;
                });
                return renderFlows(favoriteFlows);
            }).catch(console.error);

            homey.devices.getDevices().then(function (devices) {
                var favoriteDevices = me.properties.favoriteDevices.map(function (deviceId) {
                    return devices[deviceId];
                }).filter(function (device) {
                    return !!device;
                }).filter(function (device) {
                    return (device.ui && device.ui.quickAction) || device.images.length || device.class === 'windowcoverings';
                });

                favoriteDevices.forEach(function (device) {
                    var capability = !device.ui.quickAction && device.capabilitiesObj['windowcoverings_state'] ? 'windowcoverings_state' : device.ui.quickAction;

                    if (capability) {
                        device.makeCapabilityInstance(capability, function (value) {
                            console.log(device, value);

                            // Update dynamically
                            var $device = document.getElementById('device-' + device.id);
                            if ($device) {
                                $device.classList.toggle('on', isOn(device));
                            }
                        });
                    }
                });

                return renderDevices(favoriteDevices);
            }).catch(console.error);
        }).catch(console.error);
    }

    function isOn(device) {
        var capability = !device.ui.quickAction && device.capabilitiesObj['windowcoverings_state'] ? 'windowcoverings_state' : device.ui.quickAction;

        if (!device.capabilitiesObj[capability]) {
            return false;
        }

        console.log(device.capabilitiesObj[capability].value)

        switch (device.capabilitiesObj[capability].value) {
            case 'idle': return false;
            case 'down': return true;
            case 'up': return false;
        }

        return device.capabilitiesObj[capability].value === true
    }

    function renderWeather(weather) {
        $weatherTemperature.innerHTML = Math.round(weather.temperature);
        $weatherState.innerHTML = weather.state;
    }

    function renderFlows(flows) {
        $flowsInner.innerHTML = '';
        flows.forEach(function (flow) {
            var $flow = document.createElement('div');
            $flow.id = 'flow-' + flow.id;
            $flow.classList.add('flow');
            $flow.addEventListener('click', function () {
                if ($flow.classList.contains('running')) return;

                $flow.classList.add('running');

                homey.flow.triggerFlow({
                    id: flow.id,
                }).then(function () {
                    setTimeout(function () {
                        $flow.classList.remove('running');
                    }, 1500);
                }).catch(function (e) {
                    $flow.classList.add('errored');

                    setTimeout(function () {
                        $flow.classList.remove('errored');
                    }, 10000);
                });
            });
            $flowsInner.appendChild($flow);

            var $play = document.createElement('div');
            $play.classList.add('play');
            $flow.appendChild($play);

            var $name = document.createElement('div');
            $name.classList.add('name');
            $name.innerHTML = flow.name;
            $flow.appendChild($name);
        });
    }

    function renderDevices(devices) {
        $devicesInner.innerHTML = '';
        devices.forEach(function (device) {
            var $device = document.createElement('div');
            $device.id = 'device-' + device.id;
            $device.classList.add('device');
            $device.classList.toggle('on', isOn(device));
            $device.addEventListener('click', function () {
                if (device.images.length) {
                    window.location.href = '#camera-modal';

                    return;
                }

                var value = !$device.classList.contains('on');
                $device.classList.toggle('on', value);

                if (!device.ui.quickAction && device.capabilitiesObj['windowcoverings_state']) {
                    homey.devices.setCapabilityValue({
                        deviceId: device.id,
                        capabilityId: device.capabilitiesObj['windowcoverings_state']['id'],
                        value: value ? 'down' : 'up',
                    }).catch(console.error);

                    return;
                }

                homey.devices.setCapabilityValue({
                    deviceId: device.id,
                    capabilityId: device.ui.quickAction,
                    value: value,
                }).catch(console.error);
            });
            $devicesInner.appendChild($device);

            if (device.images.length) {
                var canvas = document.createElement('canvas');
                canvas.classList.add('stream');

                function drawImageScaled(img, ctx) {
                    var canvas = ctx.canvas;
                    var hRatio = canvas.width / img.width;
                    var vRatio = canvas.height / img.height;
                    var ratio = Math.min(hRatio, vRatio);
                    var centerShift_x = (canvas.width - img.width * ratio) / 2;
                    var centerShift_y = (canvas.height - img.height * ratio) / 2;
                    ctx.clearRect(0, 0, canvas.width, canvas.height);
                    ctx.drawImage(img, 0, 0, img.width, img.height,
                        centerShift_x, centerShift_y, img.width * ratio, img.height * ratio);
                }

                drawToCanvas(device.images[0].imageObj.fullUrl).addEventListener('drawn', function (source) {
                    // canvas.getContext('2d').drawImage(this, 0, 0, canvas.width, canvas.height);

                    drawImageScaled(this, canvas.getContext('2d'));
                });

                $device.appendChild(canvas);
            } else {
                var icon;
                if (device.iconObj) {
                    icon = 'https://icons-cdn.athom.com/' + device.iconObj.id + '-128.png';
                } else {
                    icon = 'https://raw.githubusercontent.com/athombv/homey-vectors-public/master/device_classes/' + device.virtualClass + '.svg';
                }

                var $icon = document.createElement('div');
                $icon.classList.add('icon');
                $icon.style.webkitMaskImage = 'url(' + icon + ')';
                $device.appendChild($icon);
            }
            console.log(device);

            var $name = document.createElement('div');
            $name.classList.add('name');
            $name.innerHTML = device.name;
            $device.appendChild($name);

            document.getElementById('container-inner').style.opacity = 1;
        });
    }

    function renderText() {
        var now = new Date();
        var hours = now.getHours();

        var tod;
        if (hours >= 18) {
            tod = 'evening';
        } else if (hours >= 12) {
            tod = 'afternoon';
        } else if (hours >= 6) {
            tod = 'morning';
        } else {
            tod = 'night';
        }

        $textLarge.innerHTML = 'Good ' + tod + '!';
        $textSmall.innerHTML = 'Today is ' + moment(now).format('dddd[, the ]Do[ of ]MMMM YYYY[.]');
    }

});