package com.example.rainbowtap

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.sp

class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContent {
            RainbowTapApp()
        }
    }
}

@Composable
fun RainbowTapApp() {
    val rainbow = listOf(
        Color(0xFFFF3B30), // Red
        Color(0xFFFF9500), // Orange
        Color(0xFFFFCC00), // Yellow
        Color(0xFF34C759), // Green
        Color(0xFF007AFF), // Blue
        Color(0xFF5856D6), // Indigo
        Color(0xFFAF52DE)  // Violet
    )
    var idx by remember { mutableStateOf(0) }
    val bg = remember(idx) { rainbow[idx % rainbow.size] }

    MaterialTheme {
        Surface(modifier = Modifier.fillMaxSize()) {
            Box(
                modifier = Modifier
                    .fillMaxSize()
                    .background(bg)
                    .clickable { idx = (idx + 1) % rainbow.size },
                contentAlignment = Alignment.Center
            ) {
                Text(
                    text = "Tap to change color\n(Release AAB ready)",
                    color = Color.White,
                    fontSize = 22.sp,
                    textAlign = TextAlign.Center
                )
            }
        }
    }
}