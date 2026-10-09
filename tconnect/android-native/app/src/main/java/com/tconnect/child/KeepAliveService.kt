package com.tconnect.child

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.app.Service
import android.content.Intent
import android.content.pm.ServiceInfo
import android.os.Build
import android.os.IBinder

/**
 * Serviço em primeiro plano que mantém o processo da Criança vivo em segundo plano,
 * para que a localização/heartbeat e os pedidos de captura continuem a ser recebidos
 * sem a app estar aberta. Mostra uma notificação persistente.
 */
class KeepAliveService : Service() {
    override fun onBind(intent: Intent?): IBinder? = null

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        val channelId = "tc_keepalive"
        if (Build.VERSION.SDK_INT >= 26) {
            val ch = NotificationChannel(channelId, "T-Connect Proteção", NotificationManager.IMPORTANCE_LOW)
            ch.setShowBadge(false)
            ch.enableVibration(false)
            getSystemService(NotificationManager::class.java).createNotificationChannel(ch)
        }
        val tapFlags = if (Build.VERSION.SDK_INT >= 23)
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        else PendingIntent.FLAG_UPDATE_CURRENT
        val tap = PendingIntent.getActivity(this, 0, Intent(this, MainActivity::class.java), tapFlags)

        val builder = if (Build.VERSION.SDK_INT >= 26)
            Notification.Builder(this, channelId) else @Suppress("DEPRECATION") Notification.Builder(this)
        val notification: Notification = builder
            .setContentTitle("T-Connect ativo")
            .setContentText("Proteção em segundo plano ligada.")
            .setSmallIcon(android.R.drawable.ic_menu_mylocation)
            .setOngoing(true)
            .setContentIntent(tap)
            .build()

        try {
            if (Build.VERSION.SDK_INT >= 34) {
                startForeground(5120, notification, ServiceInfo.FOREGROUND_SERVICE_TYPE_LOCATION)
            } else {
                startForeground(5120, notification)
            }
        } catch (_: Exception) {
            try { startForeground(5120, notification) } catch (_: Exception) {}
        }
        // START_STICKY: se o sistema matar o serviço, tenta recriá-lo.
        return START_STICKY
    }
}
