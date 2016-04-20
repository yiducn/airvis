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
        double thisLagResult;
        int length = x.length;
        TTest tTest = new TTest();
        for (int i = 0; i < length/2; i++) {
            double[] xx = Arrays.copyOfRange(x, i, length);
            double[] yy = Arrays.copyOfRange(y, 0, length - i);
            PearsonsCorrelation pearsonsCorrelation = new PearsonsCorrelation();
            thisLagResult = pearsonsCorrelation.correlation(xx, yy);
            if (abs(thisLagResult) > lagResult[1]){
                lagResult[0] = i;
                lagResult[1] = thisLagResult;
                lagResult[2] = tTest.pairedTTest(xx,yy);
            }
        }

        return lagResult;
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
    public double[] getLagCorrelPM25(String code1, String code2, String startTime, String endTime) throws ParseException {
        SimpleDateFormat df = new SimpleDateFormat("yyyy-MM-dd HH:mm:ss");
        df.setCalendar(new GregorianCalendar(new SimpleTimeZone(0, "GMT")));
        Calendar cal = Calendar.getInstance();
        //连接数据库
        MongoClient client = new MongoClient("127.0.0.1", 27017);
        DB db = client.getDB("airdb");
        DBCollection pmCollection = db.getCollection("pm_data");

        Date thisDate = df.parse(startTime);
        Date endDate = df.parse(endTime);
        ArrayList<Double> clusterTimeSeries = new ArrayList<Double>();
        ArrayList<Double> codeTimeSeries = new ArrayList<Double>();

        //查询cluster0的各时刻历史数据
        cal.setTime(df.parse(startTime));
        BasicDBObject queryCluster = new BasicDBObject();
        double thisClusterPM25, lastClusterPM25 = 0;
        while(thisDate.before(endDate)) {
            queryCluster.put("time", thisDate);
            queryCluster.put("code", code1);
            DBCursor cur = pmCollection.find(queryCluster);
            if (cur.hasNext()) {    //若存在此时刻的历史数据，则加入list中
                thisClusterPM25 = Double.parseDouble(cur.next().get("pm25").toString());
                clusterTimeSeries.add(thisClusterPM25);
                lastClusterPM25 = thisClusterPM25;
            } else {    //若不存在这个时间，则复制前一个时刻的数值
                clusterTimeSeries.add(lastClusterPM25);
            }

            cal.add(Calendar.HOUR, 1);  //时间+1h循环
            thisDate = cal.getTime();
        }

        //查询code[0]的各时刻历史数据
        cal.setTime(df.parse(startTime));
        BasicDBObject queryCode = new BasicDBObject();
        thisDate = df.parse(startTime);
        double thisCodePM25, lastCodePM25=0;
        while(thisDate.before(endDate)) {
            queryCode.put("time", thisDate);
            queryCode.put("code", code2);
            DBCursor cur = pmCollection.find(queryCode);
            if (cur.hasNext()) {    //若存在此时刻的历史数据，则加入list中
                thisCodePM25 = Double.parseDouble(cur.next().get("pm25").toString());
                codeTimeSeries.add(thisCodePM25);
                lastCodePM25 = thisCodePM25;
            } else {    //若不存在这个时间，则复制前一个时刻的数值
                codeTimeSeries.add(lastCodePM25);
            }

            cal.add(Calendar.HOUR, 1);  //时间+1h循环
            thisDate = cal.getTime();
        }

        //ArrayList转数组
        double[] clusterTimeSeriesDouble = new double[clusterTimeSeries.size()];
        for (int i = 0; i < clusterTimeSeries.size(); i++) {
            clusterTimeSeriesDouble[i] = clusterTimeSeries.get(i);
            //System.out.println(clusterTimeSeries.get(i));
        }
        double[] codeTimeSeriesDouble = new double[codeTimeSeries.size()];
        for (int i = 0; i < codeTimeSeries.size(); i++) {
            codeTimeSeriesDouble[i] = codeTimeSeries.get(i);
            //System.out.println(codeTimeSeries.get(i));
        }
        //System.out.println(clusterTimeSeries.size());
        //System.out.println(codeTimeSeries.size());

        //计算lag相关性
        double[] lagCorrelation = getLagResult(clusterTimeSeriesDouble, codeTimeSeriesDouble);
        return lagCorrelation;

    }


    /**
     *
     * @param x
     * @param y
     * @return
     */
    public double[] getLagResultEarlier(double[] x, double[] y){  //arrayY后移lag位，arrayX前端截掉，arrayY后端截掉
        double thisLagResult;
        int xlength = x.length; //x数组一直保持不变
        int allLag = y.length - x.length;
        TTest tTest = new TTest();
        for (int i = 0; i < allLag; i++) {
            double[] yy = Arrays.copyOfRange(y, i, i + xlength);    //y数组窗口后移，但长度始终和x一致
            PearsonsCorrelation pearsonsCorrelation = new PearsonsCorrelation();
            thisLagResult = pearsonsCorrelation.correlation(x, yy);
            if (abs(thisLagResult) > lagResult[1]){
                lagResult[0] = i;
                lagResult[1] = thisLagResult;
                lagResult[2] = tTest.pairedTTest(x,yy);
            }
        }

        return lagResult;
    }

    /**
     *
     * @param code1
     * @param code2
     * @param code1StartTime
     * @param code2StartTime
     * @param endTime
     * @return
     * @throws ParseException
     */
    public double[] getLagCorrelPM25Earlier(String code1, String code1StartTime, String code2, String code2StartTime, String endTime) throws ParseException {
        SimpleDateFormat df = new SimpleDateFormat("yyyy-MM-dd HH:mm:ss");
        df.setCalendar(new GregorianCalendar(new SimpleTimeZone(0, "GMT")));
        Calendar cal = Calendar.getInstance();
        //连接数据库
        MongoClient client = new MongoClient("127.0.0.1", 27017);
        DB db = client.getDB("airdb");
        DBCollection pmCollection = db.getCollection("pm_data");

        Date thisDate = df.parse(code1StartTime);
        Date endDate = df.parse(endTime);
        ArrayList<Double> clusterTimeSeries = new ArrayList<Double>();
        ArrayList<Double> codeTimeSeries = new ArrayList<Double>();

        //查询cluster0的各时刻历史数据
        cal.setTime(df.parse(code1StartTime));
        BasicDBObject queryCluster = new BasicDBObject();
        double thisClusterPM25, lastClusterPM25 = 0;
        int countMiss1 = 0;
        while(thisDate.before(endDate)) {
            queryCluster.put("time", thisDate);
            queryCluster.put("code", code1);
            DBCursor cur = pmCollection.find(queryCluster);
            if (cur.hasNext()) {    //若存在此时刻的历史数据，则加入list中
                thisClusterPM25 = Double.parseDouble(cur.next().get("pm25").toString());
                if (thisClusterPM25 != 0) {
                    clusterTimeSeries.add(thisClusterPM25);
                    lastClusterPM25 = thisClusterPM25;
                } else {
                    clusterTimeSeries.add(lastClusterPM25);
                    countMiss1 ++;
                }
            } else {    //若不存在这个时间，则复制前一个时刻的数值
                clusterTimeSeries.add(lastClusterPM25);
                countMiss1++;
            }

            cal.add(Calendar.HOUR, 1);  //时间+1h循环
            thisDate = cal.getTime();
        }
        System.out.println("countMiss1: " + countMiss1);

        //查询code[0]的各时刻历史数据
        cal.setTime(df.parse(code2StartTime));
        BasicDBObject queryCode = new BasicDBObject();
        thisDate = df.parse(code2StartTime);
        double thisCodePM25, lastCodePM25 = 0;
        int countMiss2 = 0;
        while(thisDate.before(endDate)) {
            queryCode.put("time", thisDate);
            queryCode.put("code", code2);
            DBCursor cur = pmCollection.find(queryCode);
            if (cur.hasNext()) {    //若存在此时刻的历史数据，则加入list中
                thisCodePM25 = Double.parseDouble(cur.next().get("pm25").toString());
                if (thisCodePM25 != 0) {
                    codeTimeSeries.add(thisCodePM25);
                    lastCodePM25 = thisCodePM25;
                } else {
                    codeTimeSeries.add(lastCodePM25);
                    countMiss2++;

                }
            } else {    //若不存在这个时间，则复制前一个时刻的数值
                codeTimeSeries.add(lastCodePM25);
                countMiss2++;
            }

            cal.add(Calendar.HOUR, 1);  //时间+1h循环
            thisDate = cal.getTime();
        }
        System.out.println("countMiss2: " + countMiss2);

        //ArrayList转数组
        double[] clusterTimeSeriesDouble = new double[clusterTimeSeries.size()];
        for (int i = 0; i < clusterTimeSeries.size(); i++) {
            clusterTimeSeriesDouble[i] = clusterTimeSeries.get(i);
            System.out.println(clusterTimeSeries.get(i));
        }
        double[] codeTimeSeriesDouble = new double[codeTimeSeries.size()];
        for (int i = 0; i < codeTimeSeries.size(); i++) {
            codeTimeSeriesDouble[i] = codeTimeSeries.get(i);
            //System.out.println(codeTimeSeries.get(i));
        }
        //System.out.println(clusterTimeSeries.size());
        //System.out.println(codeTimeSeries.size());

        //计算lag相关性
        double[] lagCorrelation = getLagResultEarlier(clusterTimeSeriesDouble, codeTimeSeriesDouble);
        return lagCorrelation;

    }

    public static void main(String[] args) throws ParseException {
//        double[] x,y;
//        Correlation correlation = new Correlation();
//        x = correlation.getInterpPM25TimeSeries(40.0239, 116.2202, "2015-02-08 00:00:00", "2015-02-11 09:00:00");
//        y = correlation.getInterpPM25TimeSeries(38.1006, 114.4995, "2015-02-08 00:00:00", "2015-02-11 09:00:00");
//
//        double[] lag = correlation.getLagResult(y, x);
//        System.out.println(lag[0]);
//        System.out.println(lag[1]);
//        //1分钟

        Correlation correlation = new Correlation();
        double[] lag = correlation.getLagCorrelPM25Earlier("1299A", "2015-03-12 00:00:00", "1823A", "2015-03-10 00:00:00", "2015-03-14 00:00:00");
        System.out.println(lag[0]);
        System.out.println(lag[1]);
        System.out.println(lag[2]);


    }


}
