package com.tconnect.child

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.os.Build

/**
 * Reinicia o serviço de proteção em segundo plano após o telemóvel arrancar,
 * para que o app da Criança volte a ficar detetável sem precisar de ser aberto.
 * Só atua no app da Criança (com.tconnect.child).
 */
class BootReceiver : BroadcastReceiver() {
    override fun onReceive(ctx: Context, intent: Intent?) {
        try {
            if (ctx.packageName != "com.tconnect.child") return
            val i = Intent(ctx, KeepAliveService::class.java)
            if (Build.VERSION.SDK_INT >= 26) ctx.startForegroundService(i) else ctx.startService(i)
        } catch (_: Exception) {}
    }
}
