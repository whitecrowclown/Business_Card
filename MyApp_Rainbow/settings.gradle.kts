pluginManagement {
    repositories { gradlePluginPortal(); google(); mavenCentral() }
}

// (선택 A) JDK 17 자동 다운로드를 쓰려면 켜두세요
plugins {
    id("org.gradle.toolchains.foojay-resolver-convention") version "0.8.0"
}

dependencyResolutionManagement {
    repositoriesMode.set(RepositoriesMode.FAIL_ON_PROJECT_REPOS)
    repositories { google(); mavenCentral() }
}

rootProject.name = "RainbowTap"
include(":app")
