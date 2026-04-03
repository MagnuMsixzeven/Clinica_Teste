/* push.js – Registro de Push Notifications no navegador/celular */
(function() {
    'use strict';

    const pushToggle = document.getElementById('push-toggle');
    const pushStatus = document.getElementById('push-status');

    function log(msg) {
        if (pushStatus) pushStatus.textContent = msg;
        console.log('[Push]', msg);
    }

    function urlBase64ToUint8Array(base64String) {
        const padding = '='.repeat((4 - base64String.length % 4) % 4);
        const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
        const rawData = window.atob(base64);
        const outputArray = new Uint8Array(rawData.length);
        for (let i = 0; i < rawData.length; ++i) {
            outputArray[i] = rawData.charCodeAt(i);
        }
        return outputArray;
    }

    async function getVapidKey() {
        const resp = await fetch('/api/push/vapid-key');
        const data = await resp.json();
        return data.publicKey;
    }

    async function subscribePush() {
        try {
            if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
                log('Push não suportado neste navegador.');
                return;
            }

            const permission = await Notification.requestPermission();
            if (permission !== 'granted') {
                log('Permissão de notificação negada.');
                if (pushToggle) pushToggle.checked = false;
                return;
            }

            log('Registrando service worker...');
            const registration = await navigator.serviceWorker.register('/sw.js');
            await navigator.serviceWorker.ready;

            const vapidKey = await getVapidKey();
            const applicationServerKey = urlBase64ToUint8Array(vapidKey);

            log('Criando assinatura push...');
            const subscription = await registration.pushManager.subscribe({
                userVisibleOnly: true,
                applicationServerKey: applicationServerKey
            });

            const subJson = subscription.toJSON();
            const resp = await fetch('/api/push/subscribe', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    endpoint: subJson.endpoint,
                    p256dh: subJson.keys.p256dh,
                    auth: subJson.keys.auth
                })
            });

            if (resp.ok) {
                log('Notificações push ativadas!');
                if (pushToggle) pushToggle.checked = true;
            } else {
                log('Erro ao salvar assinatura no servidor.');
            }
        } catch (err) {
            console.error('[Push] Erro:', err);
            log('Erro: ' + err.message);
            if (pushToggle) pushToggle.checked = false;
        }
    }

    async function unsubscribePush() {
        try {
            const registration = await navigator.serviceWorker.ready;
            const subscription = await registration.pushManager.getSubscription();
            if (subscription) {
                await subscription.unsubscribe();
            }
            log('Push desativado.');
        } catch (err) {
            console.error('[Push] Erro ao desativar:', err);
        }
    }

    async function checkPushStatus() {
        if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
            if (pushToggle) pushToggle.disabled = true;
            log('Push não suportado.');
            return;
        }
        try {
            const registration = await navigator.serviceWorker.ready;
            const subscription = await registration.pushManager.getSubscription();
            if (pushToggle) pushToggle.checked = !!subscription;
            if (subscription) {
                log('Push ativo.');
            } else {
                log('Push inativo.');
            }
        } catch (err) {
            log('Erro ao verificar status.');
        }
    }

    // Inicializar
    if (pushToggle) {
        checkPushStatus();
        pushToggle.addEventListener('change', function() {
            if (this.checked) {
                subscribePush();
            } else {
                unsubscribePush();
            }
        });
    }

    // Expor globalmente para uso em templates
    window.OdontoPush = { subscribe: subscribePush, unsubscribe: unsubscribePush, check: checkPushStatus };
})();
