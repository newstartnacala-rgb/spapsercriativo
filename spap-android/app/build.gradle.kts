plugins {
    id("com.android.application")
}

// Versão: o GitHub Actions passa -PappVersionName / -PappVersionCode.
val appVersionName = (findProperty("appVersionName") as String?) ?: "1.0.0"
val appVersionCode = ((findProperty("appVersionCode") as String?)?.toIntOrNull()) ?: 1

// Endereços do sistema. Ao abrir, a app lê o version.json de cada um e usa o que
// tem a versão MAIS RECENTE (assim nunca fica presa num site antigo).
val baseUrls = listOf(
    "https://newstartnacala-rgb.github.io/spapsercriativo",   // GitHub Pages: principal, sem limite diário
    "https://spapsercriativo2950.vercel.app",
    "https://spapsercriativo-spapcercruativoteam.vercel.app").joinToString("|")

android {
    namespace = "com.spapsercriativo.app"
    compileSdk = 35

    defaultConfig {
        minSdk = 24
        targetSdk = 35
        versionCode = appVersionCode
        versionName = appVersionName
        buildConfigField("String", "BASE_URLS", "\"$baseUrls\"")
    }

    buildFeatures { buildConfig = true }

    signingConfigs {
        create("spap") {
            storeFile = file("keystore/spap.jks")
            storePassword = System.getenv("SPAP_KEY_PASS") ?: "6f07d5f2476e32bdb9a7106e137643c8"
            keyAlias = "spap"
            keyPassword = System.getenv("SPAP_KEY_PASS") ?: "6f07d5f2476e32bdb9a7106e137643c8"
        }
    }

    flavorDimensions += "app"
    productFlavors {
        create("monitor") {
            dimension = "app"
            applicationId = "com.spapsercriativo.monitor"
            resValue("string", "app_name", "Monitor")
            buildConfigField("String", "START_PATH", "\"/monitor.html\"")
            buildConfigField("boolean", "IS_MONITOR", "true")
            buildConfigField("String", "APP_TIPO", "\"monitor\"")
        }
        create("loja") {
            dimension = "app"
            applicationId = "com.spapsercriativo.loja"
            resValue("string", "app_name", "Loja")
            buildConfigField("String", "START_PATH", "\"/login.html\"")
            buildConfigField("boolean", "IS_MONITOR", "false")
            buildConfigField("String", "APP_TIPO", "\"loja\"")
        }
        create("banca") {
            dimension = "app"
            applicationId = "com.spapsercriativo.banca"
            resValue("string", "app_name", "Banca")
            buildConfigField("String", "START_PATH", "\"/mobile.html\"")
            buildConfigField("boolean", "IS_MONITOR", "false")
            buildConfigField("String", "APP_TIPO", "\"banca\"")
        }
        create("bancamonitor") {
            dimension = "app"
            applicationId = "com.spapsercriativo.bancamonitor"
            resValue("string", "app_name", "Monitor Banca")
            buildConfigField("String", "START_PATH", "\"/mobile-monitor.html\"")
            buildConfigField("boolean", "IS_MONITOR", "true")
            buildConfigField("String", "APP_TIPO", "\"bancamonitor\"")
        }
    }

    buildTypes {
        getByName("release") {
            isMinifyEnabled = false
            signingConfig = signingConfigs.getByName("spap")
        }
        getByName("debug") {
            signingConfig = signingConfigs.getByName("spap")
        }
    }

    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }
}

dependencies {
    implementation("androidx.webkit:webkit:1.12.1")
    implementation("androidx.core:core:1.13.1")
}
