import React, { useState, useEffect, useRef } from 'react';
import { StyleSheet, View, Text, Modal, Pressable, Vibration } from 'react-native';
import { useAudioPlayer, setAudioModeAsync } from 'expo-audio'; 

type Props = {
  visible: boolean;
  onClose: () => void;
};

export default function FakeCallModal({ visible, onClose }: Props) {
  const [callActive, setCallActive] = useState(false);
  const [timerSeconds, setTimerSeconds] = useState(0);
  
  const callTimerRef = useRef<any>(null);

  // 1. Swapped to a premium, pleasant digital acoustic telephone tune
  const ringtoneSource = 'https://www.soundjay.com/phone-sounds-1/electronic-chime-1.mp3';
  const ringtonePlayer = useAudioPlayer({ uri: ringtoneSource });

  // 2. Your local custom natural human dad voice file
  const voiceSource = require('../assets/sounds/dad-voice.mp3');
  const voicePlayer = useAudioPlayer(voiceSource);

  // Bind initial loop variables cleanly
  if (ringtonePlayer) {
    ringtonePlayer.loop = true;
  }
  if (voicePlayer) {
    voicePlayer.loop = false;
  }

  useEffect(() => {
    if (visible && !callActive) {
      startRingtoneAndVibration();
    }

    return () => {
      stopEverything();
    };
  }, [visible, callActive]);

  async function startRingtoneAndVibration() {
    try {
      await setAudioModeAsync({
        playsInSilentMode: true,
        allowsRecording: false,
      });

      Vibration.vibrate([0, 1000, 1000, 1000], true);

      if (ringtonePlayer) {
        ringtonePlayer.loop = true; 
        ringtonePlayer.play();
      }
    } catch (error) {
      console.warn("Media hardware initialization failure:", error);
    }
  }

  // FIXED: Using expo-audio's correct .seekTo(0) function to rewind the audio heads
  function stopEverything() {
    Vibration.cancel();
    
    if (ringtonePlayer) {
      try { 
        ringtonePlayer.pause(); 
        ringtonePlayer.seekTo(0); // Rewind ringtone back to start
      } catch (e) {}
    }
    
    if (voicePlayer) {
      try { 
        voicePlayer.pause(); 
        voicePlayer.seekTo(0); // Rewind dad voice back to start so it works on run #2, #3, etc.
      } catch (e) {}
    }
    
    if (callTimerRef.current) clearInterval(callTimerRef.current);
  }

  async function handleAccept() {
    Vibration.cancel();
    if (ringtonePlayer) {
      try { ringtonePlayer.pause(); } catch (e) {}
    }

    setCallActive(true);
    
    try {
      await setAudioModeAsync({
        playsInSilentMode: true,
        allowsRecording: false,
      });

      if (voicePlayer) {
        voicePlayer.play();
      }
    } catch (error) {
      console.warn("Failed to route audio to speaker:", error);
    }

    callTimerRef.current = window.setInterval(() => {
      setTimerSeconds(prev => prev + 1);
    }, 1000);
  }

  function handleDecline() {
    stopEverything();
    setCallActive(false);
    setTimerSeconds(0);
    onClose();
  }

  function formatTime(seconds: number) {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  }

  return (
    <Modal visible={visible} animationType="slide" transparent={false}>
      <View style={styles.container}>
        
        {/* Caller Identity Block */}
        <View style={styles.callerIdentityContainer}>
          <View style={styles.avatarCircle}>
            <Text style={styles.avatarText}>D</Text>
          </View>
          <Text style={styles.callerName}>Dad</Text>
          <Text style={styles.callStatus}>
            {callActive ? formatTime(timerSeconds) : "Mobile"}
          </Text>
        </View>

        {/* Dynamic Action Controls */}
        {!callActive ? (
          <View style={styles.actionRow}>
            <View style={styles.buttonWrapper}>
              <Pressable style={[styles.circleBtn, styles.declineBtn]} onPress={handleDecline}>
                <Text style={styles.btnIcon}>📞</Text>
              </Pressable>
              <Text style={styles.btnLabel}>Decline</Text>
            </View>

            <View style={styles.buttonWrapper}>
              <Pressable style={[styles.circleBtn, styles.acceptBtn]} onPress={handleAccept}>
                <Text style={styles.btnIcon}>📞</Text>
              </Pressable>
              <Text style={styles.btnLabel}>Accept</Text>
            </View>
          </View>
        ) : (
          <View style={styles.activeCallControlsContainer}>
            <View style={styles.keypadGrid}>
              <View style={styles.gridItem}><Text style={styles.gridIcon}>🔇</Text><Text style={styles.gridLabel}>mute</Text></View>
              <View style={styles.gridItem}><Text style={styles.gridIcon}>🔢</Text><Text style={styles.gridLabel}>keypad</Text></View>
              <View style={styles.gridItem}><Text style={styles.gridIcon}>🔊</Text><Text style={styles.gridLabel}>speaker</Text></View>
              <View style={styles.gridItem}><Text style={styles.gridIcon}>➕</Text><Text style={styles.gridLabel}>add call</Text></View>
              <View style={styles.gridItem}><Text style={styles.gridIcon}>📹</Text><Text style={styles.gridLabel}>FaceTime</Text></View>
              <View style={styles.gridItem}><Text style={styles.gridIcon}>👤</Text><Text style={styles.gridLabel}>contacts</Text></View>
            </View>
            
            <View style={styles.buttonWrapper}>
              <Pressable style={[styles.circleBtn, styles.declineBtn]} onPress={handleDecline}>
                <Text style={styles.btnIcon}>📞</Text>
              </Pressable>
              <Text style={styles.btnLabel}>End Call</Text>
            </View>
          </View>
        )}

      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0A0E14', justifyContent: 'space-between', paddingVertical: 70, alignItems: 'center' },
  callerIdentityContainer: { alignItems: 'center', marginTop: 30 },
  avatarCircle: { width: 90, height: 90, borderRadius: 45, backgroundColor: '#2C3E50', justifyContent: 'center', alignItems: 'center', marginBottom: 16, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
  avatarText: { color: '#ECF0F1', fontSize: 36, fontWeight: 'bold' },
  callerName: { color: '#FFFFFF', fontSize: 34, fontWeight: '400', marginBottom: 6 },
  callStatus: { color: '#8A99A6', fontSize: 16, fontWeight: '400', letterSpacing: 0.5 },
  actionRow: { flexDirection: 'row', width: '100%', justifyContent: 'space-around', paddingHorizontal: 30, marginBottom: 20 },
  buttonWrapper: { alignItems: 'center' },
  circleBtn: { width: 72, height: 72, borderRadius: 36, justifyContent: 'center', alignItems: 'center', marginBottom: 10 },
  acceptBtn: { backgroundColor: '#2ECC71' },
  declineBtn: { backgroundColor: '#E74C3C', transform: [{ rotate: '135deg' }] },
  btnIcon: { color: '#FFFFFF', fontSize: 26 },
  btnLabel: { color: '#FFFFFF', fontSize: 13, fontWeight: '500' },
  activeCallControlsContainer: { width: '100%', alignItems: 'center', paddingHorizontal: 40 },
  keypadGrid: { flexDirection: 'row', flexWrap: 'wrap', width: '100%', justifyContent: 'space-between', marginBottom: 50, gap: 24 },
  gridItem: { width: '28%', alignItems: 'center', marginVertical: 10 },
  gridIcon: { fontSize: 24, marginBottom: 6 },
  gridLabel: { color: '#8A99A6', fontSize: 12, textAlign: 'center' }
});