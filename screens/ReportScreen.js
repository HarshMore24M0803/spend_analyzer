import React, { useEffect, useState, useCallback, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, Dimensions, TouchableOpacity, Alert, Platform } from 'react-native';
import { fetchExpenses } from '../database/db';
import { PieChart, LineChart } from 'react-native-chart-kit';
import { Picker } from '@react-native-picker/picker';
import DateTimePicker from '@react-native-community/datetimepicker';
import ViewShot from 'react-native-view-shot';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system';
import * as DocumentPicker from 'expo-document-picker';

const screenWidth = Dimensions.get('window').width;

function ReportScreen() {
  const [allExpenses, setAllExpenses] = useState([]);
  const [filteredExpenses, setFilteredExpenses] = useState([]);
  const [totalSpent, setTotalSpent] = useState(0);
  const [filterType, setFilterType] = useState('week');
  const [customStartDate, setCustomStartDate] = useState(new Date());
  const [customEndDate, setCustomEndDate] = useState(new Date());
  const [showStartPicker, setShowStartPicker] = useState(false);
  const [showEndPicker, setShowEndPicker] = useState(false);
  const [tags, setTags] = useState([]);
  const [expandedTags, setExpandedTags] = useState({});

  const pieChartRef = useRef(null);
  const trendChartRef = useRef(null);
  const tagChartRefs = useRef({});

  useEffect(() => {
    loadExpenses();
  }, []);

  useEffect(() => {
    applyFilter();
  }, [filterType, customStartDate, customEndDate, allExpenses]);

  const loadExpenses = async () => {
    try {
      const expenses = await fetchExpenses();
      setAllExpenses(expenses);
      setTotalSpent(expenses.reduce((sum, e) => sum + parseFloat(e.amount), 0));
      setTags([...new Set(expenses.map(e => e.tag))]);
    } catch (e) {
      console.error(e);
      Alert.alert('Error', 'Failed to load expenses');
    }
  };

  const applyFilter = () => {
    let startDate = new Date();
    if (filterType === 'week') startDate.setDate(startDate.getDate() - 7);
    else if (filterType === 'month') startDate.setDate(startDate.getDate() - 30);
    else if (filterType === 'custom') startDate = customStartDate;

    const endDate = filterType === 'custom' ? customEndDate : new Date();

    const filtered = allExpenses.filter(e => {
      const d = new Date(e.date);
      return d >= startDate && d <= endDate;
    });
    setFilteredExpenses(filtered);
  };

  const getPieChartData = () => {
    const totalsByTag = {};
    filteredExpenses.forEach(e => {
      totalsByTag[e.tag] = (totalsByTag[e.tag] || 0) + parseFloat(e.amount);
    });
    return Object.keys(totalsByTag).map(tag => ({
      name: tag,
      amount: totalsByTag[tag],
      color: getRandomColor(),
      legendFontColor: '#333',
      legendFontSize: 14,
    }));
  };

  const getRandomColor = () => {
    const letters = '0123456789ABCDEF';
    let color = '#';
    for (let i = 0; i < 6; i++) color += letters[Math.floor(Math.random() * 16)];
    return color;
  };

  const getMonthlyTrends = (expenses, months = 6) => {
    const now = new Date();
    const labels = [];
    const data = [];
    for (let i = months - 1; i >= 0; i--) {
      const month = new Date(now.getFullYear(), now.getMonth() - i, 1);
      labels.push(month.toLocaleString('default', { month: 'short' }));
      const monthTotal = expenses
        .filter(e => {
          const d = new Date(e.date);
          return d.getMonth() === month.getMonth() && d.getFullYear() === month.getFullYear();
        })
        .reduce((sum, e) => sum + parseFloat(e.amount), 0);
      data.push(monthTotal);
    }
    return { labels, data };
  };

  const getMaxSpending = (expenses, months = 6) => {
    const now = new Date();
    let maxVal = 0;
    for (let i = months - 1; i >= 0; i--) {
      const month = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthTotal = expenses
        .filter(e => {
          const d = new Date(e.date);
          return d.getMonth() === month.getMonth() && d.getFullYear() === month.getFullYear();
        })
        .reduce((sum, e) => sum + parseFloat(e.amount), 0);
      if (monthTotal > maxVal) maxVal = monthTotal;
    }
    return maxVal;
  };

  const globalMax = Math.max(
    getMaxSpending(allExpenses),
    ...tags.map(tag => getMaxSpending(allExpenses.filter(e => e.tag === tag)))
  );

const renderLineChart = (expenses, ref) => {
  const trend = getMonthlyTrends(expenses);
  const normalizedData = trend.data.map(v => v || 0);
  // Pad with global max to keep charts consistent
  if (Math.max(...normalizedData) < globalMax) {
    normalizedData.push(globalMax);
  }

  return (
    <ViewShot ref={ref} options={{ format: 'png', quality: 1.0 }}>
      <LineChart
        data={{
          labels: trend.labels,
          datasets: [{ data: normalizedData }],
        }}
        width={screenWidth * 0.9}
        height={220}
        yAxisLabel="₹"
        fromZero
        withDots={true}
        yAxisInterval={1}
        chartConfig={{
          backgroundColor: '#ffffff',
          backgroundGradientFrom: '#f5f5f5',
          backgroundGradientTo: '#f5f5f5',
          color: (opacity = 1) => `rgba(0,0,0,${opacity})`,
          labelColor: (opacity = 1) => `rgba(0,0,0,${opacity})`,
        }}
        style={{ marginVertical: 10, borderRadius: 8 }}
      />
    </ViewShot>
  );
};


  const toggleTag = (tag) => {
    setExpandedTags(prev => ({ ...prev, [tag]: !prev[tag] }));
  };

  const downloadReport = async () => {
    try {
      const pieUri = await pieChartRef.current.capture();
      const trendUri = await trendChartRef.current.capture();
      const tagUris = {};
      for (const tag of tags) {
        if (tagChartRefs.current[tag]) {
          tagUris[tag] = await tagChartRefs.current[tag].capture();
        }
      }

      const pieBase64 = `data:image/png;base64,${await FileSystem.readAsStringAsync(pieUri, { encoding: FileSystem.EncodingType.Base64 })}`;
      const trendBase64 = `data:image/png;base64,${await FileSystem.readAsStringAsync(trendUri, { encoding: FileSystem.EncodingType.Base64 })}`;

      let tagImagesHTML = '';
      for (const tag of Object.keys(tagUris)) {
        const imgBase64 = `data:image/png;base64,${await FileSystem.readAsStringAsync(tagUris[tag], { encoding: FileSystem.EncodingType.Base64 })}`;
        tagImagesHTML += `<div style="page-break-before: always;"><h3>${tag}</h3><img src="${imgBase64}" style="width:100%;margin-bottom:20px;" /></div>`;
      }

      const rows = filteredExpenses.map(e => `
        <tr>
          <td>₹${e.amount}</td>
          <td>${e.tag}</td>
          <td>${e.note || ''}</td>
          <td>${new Date(e.date).toLocaleDateString()}</td>
        </tr>
      `).join('');

      const html = `
        <html>
          <head>
            <style>
              body { font-family: Arial, sans-serif; padding: 20px; }
              h1 { color: #6200EE; text-align: center; }
              h2, h3 { text-align: center; }
              img { display: block; margin: 20px auto; }
              table { width: 100%; border-collapse: collapse; margin-top: 20px; }
              th, td { border: 1px solid #ccc; padding: 8px; font-size: 14px; }
              th { background: #f0f0f0; }
              .page-break { page-break-before: always; }
            </style>
          </head>
          <body>
            <h1>Spending Report</h1>
            <h2>Total Spent: ₹${totalSpent.toFixed(2)}</h2>
            <h3>Spending Breakdown</h3>
            <img src="${pieBase64}" style="width:100%;"/>

            <div class="page-break"></div>

            <h3>6-Month Trend</h3>
            <img src="${trendBase64}" style="width:100%;"/>

            ${tagImagesHTML}

            <div class="page-break"></div>

            <h3>Transactions</h3>
            <table>
              <tr>
                <th>Amount</th>
                <th>Tag</th>
                <th>Note</th>
                <th>Date</th>
              </tr>
              ${rows}
            </table>
          </body>
        </html>
      `;

      const { uri } = await Print.printToFileAsync({ html });

      // Ask user for filename
      const filename = `Spending_Report_${new Date().toISOString().split('T')[0]}.pdf`;
      const newPath = FileSystem.documentDirectory + filename;
      await FileSystem.moveAsync({ from: uri, to: newPath });

      // Open the share dialog
      await Sharing.shareAsync(newPath, {
        mimeType: 'application/pdf',
        dialogTitle: 'Share Report',
      });

      Alert.alert('Success', `Report generated: ${filename}`);

    } catch (err) {
      console.error(err);
      Alert.alert('Error', 'Failed to generate report.');
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.scrollContainer}>
      <Text style={styles.title}>Total Spending So Far</Text>
      <Text style={styles.totalAmount}>₹{totalSpent.toFixed(2)}</Text>

      <Text style={styles.sectionTitle}>Filter by Date</Text>
      <Picker selectedValue={filterType} onValueChange={(itemValue) => setFilterType(itemValue)} style={styles.picker}>
        <Picker.Item label="Week (Last 7 Days)" value="week" />
        <Picker.Item label="Month (Last 30 Days)" value="month" />
        <Picker.Item label="Custom Range" value="custom" />
      </Picker>

      {filterType === 'custom' && (
        <View style={styles.datePickers}>
          <TouchableOpacity onPress={() => setShowStartPicker(true)} style={styles.dateButton}>
            <Text>From: {customStartDate.toLocaleDateString()}</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setShowEndPicker(true)} style={styles.dateButton}>
            <Text>To: {customEndDate.toLocaleDateString()}</Text>
          </TouchableOpacity>
        </View>
      )}
      {showStartPicker && (
        <DateTimePicker
          value={customStartDate}
          mode="date"
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          onChange={(e, date) => { setShowStartPicker(false); if (date) setCustomStartDate(date); }}
        />
      )}
      {showEndPicker && (
        <DateTimePicker
          value={customEndDate}
          mode="date"
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          onChange={(e, date) => { setShowEndPicker(false); if (date) setCustomEndDate(date); }}
        />
      )}

      <Text style={styles.sectionTitle}>Spending Breakdown</Text>
      <ViewShot ref={pieChartRef} options={{ format: 'png', quality: 1.0 }}>
        <PieChart
          data={getPieChartData()}
          width={screenWidth * 0.9}
          height={220}
          chartConfig={{
            backgroundColor: '#ffffff',
            backgroundGradientFrom: '#ffffff',
            backgroundGradientTo: '#ffffff',
            color: (opacity = 1) => `rgba(0,0,0,${opacity})`,
            labelColor: (opacity = 1) => `rgba(0,0,0,${opacity})`,
          }}
          accessor="amount"
          backgroundColor="transparent"
          paddingLeft="15"
          style={{ borderRadius: 8 }}
        />
      </ViewShot>

      <Text style={styles.sectionTitle}>Trends - Last 6 Months (All Tags)</Text>
      {renderLineChart(allExpenses, trendChartRef)}

      <Text style={styles.sectionTitle}>Per Tag Trends</Text>
      {tags.map(tag => (
        <View key={tag}>
          <TouchableOpacity onPress={() => toggleTag(tag)}>
            <Text style={styles.subTitle}>{expandedTags[tag] ? `▼ ${tag}` : `▶ ${tag}`}</Text>
          </TouchableOpacity>
          {expandedTags[tag] && renderLineChart(allExpenses.filter(e => e.tag === tag), (ref => tagChartRefs.current[tag] = ref))}
        </View>
      ))}

      <TouchableOpacity style={styles.downloadButton} onPress={downloadReport}>
        <Text style={styles.downloadButtonText}>Download Full Report (PDF)</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scrollContainer: { flexGrow: 1, padding: 20 },
  title: { fontSize: 24, fontWeight: 'bold', textAlign: 'center' },
  totalAmount: { fontSize: 32, color: '#6200EE', textAlign: 'center', marginBottom: 20 },
  sectionTitle: { fontSize: 20, fontWeight: 'bold', marginTop: 20, marginBottom: 10 },
  subTitle: { fontSize: 18, fontWeight: '600', marginVertical: 10 },
  picker: { backgroundColor: '#f2f2f2', borderRadius: 8 },
  datePickers: { flexDirection: 'row', justifyContent: 'space-between', marginVertical: 10 },
  dateButton: { padding: 10, backgroundColor: '#eee', borderRadius: 8 },
  downloadButton: { backgroundColor: '#4CAF50', padding: 15, borderRadius: 8, marginVertical: 20 },
  downloadButtonText: { color: '#fff', textAlign: 'center', fontWeight: 'bold', fontSize: 16 },
});

export default ReportScreen;
