package ar.jornadasrn

import android.os.Bundle
import com.facebook.react.ReactActivity
import com.facebook.react.ReactActivityDelegate
import com.facebook.react.defaults.DefaultReactActivityDelegate
import java.util.UUID

class MainActivity : ReactActivity() {
    private lateinit var sessionKey: String

    override fun onCreate(savedInstanceState: Bundle?) {
        sessionKey = savedInstanceState?.getString("sessionKey") ?: UUID.randomUUID().toString()
        super.onCreate(savedInstanceState)
    }

    override fun onSaveInstanceState(outState: Bundle) {
        outState.putString("sessionKey", sessionKey)
        super.onSaveInstanceState(outState)
    }

    override fun getMainComponentName() = "JornadasRN"

    override fun createReactActivityDelegate(): ReactActivityDelegate =
        object : DefaultReactActivityDelegate(this, mainComponentName, false) {
            override fun getLaunchOptions() = Bundle().apply {
                putString("taskKey", sessionKey)
                // Arranque sin servicio: se acepta el extra original (sin_servicio true)
                // y el que nombra el README de la consigna (servicio_disponible false).
                val sinServicio = intent.getBooleanExtra("sin_servicio", false)
                val servicioDisponible = intent.getBooleanExtra("servicio_disponible", true)
                putBoolean("offlineStart", sinServicio || !servicioDisponible)
            }
        }
}
