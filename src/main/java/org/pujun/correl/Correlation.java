package org.pujun.correl;

import com.mongodb.*;
import com.mongodb.client.MongoCollection;
import com.mongodb.client.MongoCursor;
import com.mongodb.client.MongoDatabase;
import org.apache.commons.math3.stat.correlation.PearsonsCorrelation;
import org.apache.commons.math3.stat.inference.TTest;
import org.bson.Document;
import org.json.JSONArray;
import org.json.JSONObject;
import org.pujun.interp.InterpPm;

import java.text.ParseException;
import java.text.SimpleDateFormat;
import java.util.*;

import static java.lang.Math.abs;

/**
 * Created by milletpu on 16/4/9.
 */
public class Correlation {
    private double pearsonsResult;
    private double[] lagResult = new double[3];

    /**
     * Input two time series and get correlation value in return
     * 输入两个数组，计算出其相关性
     * @param x
     * @param y
     * @return
     */
    public double getPearsonsResult(double[] x, double[] y){

        PearsonsCorrelation pearsonsCorrelation = new PearsonsCorrelation();
        pearsonsResult = pearsonsCorrelation.correlation(x,y);

        return pearsonsResult;
    }

    /**
     * 输入纬度＋经度＋起始时间＋结束时间，计算出该地点在该时间段内“每天”的pm2.5插值数据。
     * “每天”／“每小时”／可以内部调整。
     * @param lat
     * @param lon
     * @param startTime
     * @param endTime
     * @return
     * @throws ParseException
     */
    public double[] getInterpPM25TimeSeries(double lat, double lon, String startTime, String endTime) throws ParseException {
        Date startDate, endDate;
        SimpleDateFormat df = new SimpleDateFormat("yyyy-MM-dd HH:mm:ss");
        df.setCalendar(new GregorianCalendar(new SimpleTimeZone(0, "GMT")));

        startDate = df.parse(startTime);
        endDate = df.parse(endTime);

        ArrayList<Double> interpPm25ResultList = new ArrayList<Double>();
        InterpPm interpPm = new InterpPm(df.format(startDate));
        Calendar cal = Calendar.getInstance();
        cal.setTime(startDate);
        while(startDate.before(endDate)) {
            interpPm.date = startDate;
            double n = interpPm.pm25(lat, lon);
            interpPm25ResultList.add(n); //记录下此时间的插值计算结果
            //System.out.println(n);
            cal.add(Calendar.HOUR, 1);
            startDate = cal.getTime();
            //历史数据中不存在的日期，直接取前一天的数据；存在的可直接计算出？？？第一天不存在？

        }
        double[] interpPm25Result = new double[interpPm25ResultList.size()];
        for (int i = 0; i < interpPm25ResultList.size(); i++) {
            interpPm25Result[i] = interpPm25ResultList.get(i);
        }
        return interpPm25Result;
    }

    /**
     * Input two time seires then get the best lag and its correlation value in return
     * 输入两个数组，计算出最优lag和对应的相关性数值
     * @param x
     * @param y
     * @return LagResult[0]: best lag, lagResult[1]: correlation value, lagResult[2]: p-value
     */
    public double[] getLagResult(double[] x, double[] y){  //arrayY后移lag位，arrayX前端截掉，arrayY后端截掉
        double[] result = new double[3];
        double thisLagResult;
        int length = x.length;
        PearsonsCorrelation pearsonsCorrelation = new PearsonsCorrelation();
        TTest tTest = new TTest();
        for (int i = 0; i < length/2; i++) {
            double[] xx = Arrays.copyOfRange(x, i, length);
            double[] yy = Arrays.copyOfRange(y, 0, length - i);
            thisLagResult = pearsonsCorrelation.correlation(xx, yy);
            if (thisLagResult > abs(result[1])){    //不使用绝对值
                result[0] = i;
                result[1] = thisLagResult;
                result[2] = tTest.pairedTTest(xx,yy);
            }
        }

        return result;
    }

    /**
     * 输入两个观测站点的“编号”，观测开始时间，结束时间。
     * 得到两个站点在此时间段内的最优lag和对应的相关度。耗时3s
     * @param code1
     * @param code2
     * @param startTime
     * @param endTime
     * @return 返回: [0]=lag, [1]=correaltion value
     * @throws ParseException
     */
//    public double[] getLagCorrelPM25(String code1, String startTime, String endTime, String code2) throws ParseException {
//        SimpleDateFormat df = new SimpleDateFormat("yyyy-MM-dd HH:mm:ss");
//        df.setCalendar(new GregorianCalendar(new SimpleTimeZone(0, "GMT")));
//        Calendar cal = Calendar.getInstance();
//        //连接数据库
//        MongoClient client = new MongoClient("127.0.0.1", 27017);
//        DB db = client.getDB("airdb");
//        DBCollection pmCollection = db.getCollection("pm_data");
//
//        Date thisDate = df.parse(startTime);
//        Date endDate = df.parse(endTime);
//        ArrayList<Double> clusterTimeSeries = new ArrayList<Double>();
//        ArrayList<Double> codeTimeSeries = new ArrayList<Double>();
//
//        //查询cluster0的各时刻历史数据
//        cal.setTime(df.parse(startTime));
//        BasicDBObject queryCluster = new BasicDBObject();
//        double thisClusterPM25, lastClusterPM25 = 0;
//        while(thisDate.before(endDate)) {
//            queryCluster.put("time", thisDate);
//            queryCluster.put("code", code1);
//            DBCursor cur = pmCollection.find(queryCluster);
//            if (cur.hasNext()) {    //若存在此时刻的历史数据，则加入list中
//                thisClusterPM25 = Double.parseDouble(cur.next().get("pm25").toString());
//                clusterTimeSeries.add(thisClusterPM25);
//                lastClusterPM25 = thisClusterPM25;
//            } else {    //若不存在这个时间，则复制前一个时刻的数值
//                clusterTimeSeries.add(lastClusterPM25);
//            }
//
//            cal.add(Calendar.HOUR, 1);  //时间+1h循环
//            thisDate = cal.getTime();
//        }
//
//        //查询code[0]的各时刻历史数据
//        cal.setTime(df.parse(startTime));
//        BasicDBObject queryCode = new BasicDBObject();
//        thisDate = df.parse(startTime);
//        double thisCodePM25, lastCodePM25=0;
//        while(thisDate.before(endDate)) {
//            queryCode.put("time", thisDate);
//            queryCode.put("code", code2);
//            DBCursor cur = pmCollection.find(queryCode);
//            if (cur.hasNext()) {    //若存在此时刻的历史数据，则加入list中
//                thisCodePM25 = Double.parseDouble(cur.next().get("pm25").toString());
//                codeTimeSeries.add(thisCodePM25);
//                lastCodePM25 = thisCodePM25;
//            } else {    //若不存在这个时间，则复制前一个时刻的数值
//                codeTimeSeries.add(lastCodePM25);
//            }
//
//            cal.add(Calendar.HOUR, 1);  //时间+1h循环
//            thisDate = cal.getTime();
//        }
//
//        //ArrayList转数组
//        double[] clusterTimeSeriesDouble = new double[clusterTimeSeries.size()];
//        for (int i = 0; i < clusterTimeSeries.size(); i++) {
//            clusterTimeSeriesDouble[i] = clusterTimeSeries.get(i);
//            //System.out.println(clusterTimeSeries.get(i));
//        }
//        double[] codeTimeSeriesDouble = new double[codeTimeSeries.size()];
//        for (int i = 0; i < codeTimeSeries.size(); i++) {
//            codeTimeSeriesDouble[i] = codeTimeSeries.get(i);
//            //System.out.println(codeTimeSeries.get(i));
//        }
//        //System.out.println(clusterTimeSeries.size());
//        //System.out.println(codeTimeSeries.size());
//
//        //计算lag相关性
//        double[] lagCorrelation = getLagResult(clusterTimeSeriesDouble, codeTimeSeriesDouble);
//        return lagCorrelation;
//
//    }


    /**
     *
     * @param x
     * @param y
     * @return
     */
    public ArrayList<double[]> getLagResultEarlier(double[] x, double[] y){  //y数组头部后移lag位，但长度始终与x相等；x不做任何变化
        ArrayList<double[]> returnValue = new ArrayList<double[]>();

        double thisLagResult;
        int xlength = x.length; //x数组一直保持不变
        int allLag = y.length - x.length;
        TTest tTest = new TTest();
        PearsonsCorrelation pearsonsCorrelation = new PearsonsCorrelation();
        for (int i = 0; i <= allLag; i++) {
            double[] result = new double[3];
            double[] yy = Arrays.copyOfRange(y, i, i + xlength);    //y数组窗口后移，但长度始终和x一致
            thisLagResult = pearsonsCorrelation.correlation(x, yy);
//            if (thisLagResult > result[1]){     //不使用绝对值，忽略负相关
            result[0] = i;
            result[1] = thisLagResult;
            result[2] = tTest.pairedTTest(x,yy);
            returnValue.add(result);
//            }
        }
        return returnValue;
    }

//    /**
//     *
//     * @param code1 cluster[0]
//     * @param code2 codes[0]
//     * @param startTime
//     * @param endTime
//     * @return
//     * @throws ParseException
//     */
//    public double[] getLagCorrelPM25Earlier(String code1, String startTime, String endTime, String code2) throws ParseException {
//        SimpleDateFormat df = new SimpleDateFormat("yyyy-MM-dd HH:mm:ss");
//        df.setCalendar(new GregorianCalendar(new SimpleTimeZone(0, "GMT")));
//        Calendar cal = Calendar.getInstance();
//        Calendar cal2 = Calendar.getInstance();
//        //连接数据库
//        MongoClient client = new MongoClient("127.0.0.1", 27017);
//        MongoDatabase db = client.getDatabase("airdb");
//        MongoCollection pmCollection = db.getCollection("pm_data");
//
//        Date startDate, endDate;
//        ArrayList<Double> clusterTimeSeries = new ArrayList<Double>();
//        ArrayList<Double> codeTimeSeries = new ArrayList<Double>();
//
//        //查询cluster0的各时刻历史数据
//        cal.setTime(df.parse(startTime));
//        cal.add(Calendar.HOUR, -48);  //cluster提前两天
//        startDate = cal.getTime();
//        cal2.setTime(df.parse(endTime));
//        cal2.add(Calendar.HOUR, 48);
//        endDate = cal2.getTime();
//        Document queryCluster = new Document();
//        queryCluster.append("time", new Document("$gte", startDate).append("$lt", endDate));
//        queryCluster.append("code", code1);
//
//        MongoCursor cur2 = pmCollection.find(queryCluster).sort(new BasicDBObject("time", 1)).iterator();
//        Document pre2 = null;
//        double thisClusterValue = 0, preClusterValue =0;
//        while (cur2.hasNext()) {    //若存在此时刻的历史数据，则直接将历史数据加入list中
//            Document d = (Document) cur2.next();
//            thisClusterValue = (double) d.getInteger("pm25");
//            if(pre2 == null) {
//                int interval = (int)(d.getDate("time").getTime() - startDate.getTime()) / (1000*60*60);
//                if(interval == 0) {
//                    clusterTimeSeries.add(thisClusterValue);
//                    preClusterValue = thisClusterValue;
//                }else{
//                    for (int i = 0; i < interval; i++) {
//                        clusterTimeSeries.add(preClusterValue);
//                    }
//                    clusterTimeSeries.add(thisClusterValue);
//                }
//
//                pre2 = d;
//            }else {
//                int interval = (int) (d.getDate("time").getTime() - pre2.getDate("time").getTime()) / (1000*60*60);
//                if(interval == 1) {
//
//                }else {
//                    for (int j = 0; j < interval-1; j++) {
//                        clusterTimeSeries.add(preClusterValue);
//                    }
//                }
//
//                if(thisClusterValue != 0) {
//                    clusterTimeSeries.add(thisClusterValue);
//                    preClusterValue = thisClusterValue;
//                }else{
//                    clusterTimeSeries.add(preClusterValue);
//                }
//
//                pre2 = d;
//
//            }
//        }
//        //System.out.println("countMiss1: " + countMiss1);
//
//        //查询code[0]的各时刻历史数据
//        startDate = df.parse(startTime);
//        endDate = df.parse(endTime);
//        Document queryCode = new Document();
//        queryCode.append("time", new Document("$gte", startDate).append("$lt", endDate));
//        queryCode.append("code", code2);
//
//        MongoCursor cur = pmCollection.find(queryCode).sort(new BasicDBObject("time", 1)).iterator();
//        Document pre = null;
//        double thisCodeValue = 0, preCodeValue = 0;
//        while (cur.hasNext()) {    //若存在此时刻的历史数据，则直接将历史数据加入list中
//            Document d = (Document) cur.next();
//            thisCodeValue = (double) d.getInteger("pm25");
//            if(pre == null) {
//                int interval = (int)(d.getDate("time").getTime() - startDate.getTime()) / (1000*60*60);
//                if(interval == 0) {
//                    codeTimeSeries.add(thisCodeValue);
//                    preCodeValue = thisCodeValue;
//                }else{
//                    for (int i = 0; i < interval; i++) {
//                        codeTimeSeries.add(preCodeValue);
//                    }
//                    codeTimeSeries.add(thisCodeValue);
//                }
//
//                pre = d;
//            } else {
//                int interval = (int) (d.getDate("time").getTime() - pre.getDate("time").getTime()) / (1000*60*60);
//                if(interval == 1) {
//
//                }else{
//                    for (int i = 0; i < interval-1; i++) {
//                        codeTimeSeries.add(preCodeValue);
//                    }
//                }
//
//                if(thisCodeValue!=0){
//                    codeTimeSeries.add(thisCodeValue);
//                    preCodeValue = thisCodeValue;
//                }else{
//                    codeTimeSeries.add(preCodeValue);
//                }
//
//                pre = d;
//            }
//        }
//        //System.out.println("countMiss2: " + countMiss2);
//
//        //ArrayList转数组
//        double[] clusterTimeSeriesDouble = new double[clusterTimeSeries.size()];
//        for (int i = 0; i < clusterTimeSeries.size(); i++) {
//            clusterTimeSeriesDouble[i] = clusterTimeSeries.get(i);
//            System.out.println(clusterTimeSeries.get(i));
//        }
//
//        double[] codeTimeSeriesDouble = new double[codeTimeSeries.size()];
//        for (int i = 0; i < codeTimeSeries.size(); i++) {
//            codeTimeSeriesDouble[i] = codeTimeSeries.get(i);
//            //System.out.println(codeTimeSeries.get(i));
//        }
//
//        //System.out.println(clusterTimeSeries.size());
//        //System.out.println(codeTimeSeries.size());
//
//        //计算lag相关性
//        double[] lagCorrelation = getLagResultEarlier(codeTimeSeriesDouble, clusterTimeSeriesDouble);
//        return lagCorrelation;
//
//    }


    public void yes(){

        MongoClient client = new MongoClient("127.0.0.1", 27017);
        MongoDatabase db = client.getDatabase("airdb");
        MongoCollection meteoCollection = db.getCollection("meteo_data");

        Document query = new Document();
        query.append("usaf", 507560);
        MongoCursor cur = meteoCollection.find(query).iterator();

        Document document = (Document) cur.next();
        System.out.println(document.get("time"));
        long newDateSeconds = document.getDate("time").getTime() + 1000*60*60;
        Date newDate = new Date(newDateSeconds);
        System.out.println(newDate);


    }
    public static void main(String[] args) throws ParseException {

//        Correlation correlation = new Correlation();
//        //cluster time time codes。          cluster在前，主点在后
//        double[] lag = correlation.getLagCorrelPM25Earlier("1299A", "2015-03-12 00:00:00", "2015-03-14 00:00:00", "1823A");
//        System.out.println(48 - lag[0]);
//        System.out.println(lag[1]);
//        System.out.println(lag[2]);


        //correlation.yes();


    }


}
