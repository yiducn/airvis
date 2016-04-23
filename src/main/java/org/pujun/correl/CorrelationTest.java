package org.pujun.correl;

import com.mongodb.*;
import org.apache.commons.math3.stat.correlation.PearsonsCorrelation;
import org.apache.commons.math3.stat.inference.TTest;
import org.pujun.interp.InterpPm;

import java.text.ParseException;
import java.text.SimpleDateFormat;
import java.util.*;

import static java.lang.Math.abs;

/**
 * Created by milletpu on 16/4/23.
 */
public class CorrelationTest {
    public double getPearsonsResult(double[] x, double[] y){

        PearsonsCorrelation pearsonsCorrelation = new PearsonsCorrelation();
        double pearsonsResult = pearsonsCorrelation.correlation(x,y);

        return pearsonsResult;
    }


    public double[] getCorrelPM25(String code1, String startTime, String endTime, String code2) throws ParseException {
        double[] result = new double[2];
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

        //计算相关性和ttest
        result[0] = getPearsonsResult(clusterTimeSeriesDouble, codeTimeSeriesDouble);
        TTest tTest = new TTest();
        result[1] = tTest.pairedTTest(clusterTimeSeriesDouble, codeTimeSeriesDouble);
        client.close();
        return result;

    }


    public static void main(String[] args) throws ParseException {
        CorrelationTest correlationTest = new CorrelationTest();
        String[] beijing = {"1001A","1002A","1003A","1004A","1005A","1006A","1007A","1008A","1009A","1010A","1011A","1012A"};
        double[] correlation = new double[12];
        double[] ttest = new double[12];

        for(int i = 0; i< 12; i++) {
            double result[] = correlationTest.getCorrelPM25("1001A", "2015-03-01 00:00:00", "2015-04-01 00:00:00", beijing[i]);
            correlation[i] = result[0];
            ttest[i] = result[1];
        }
        for (int i = 0; i < 12; i++) {
            System.out.println(correlation[i]);
        }
        System.out.println("----------------------");
        for (int i = 0; i < 12; i++) {
            System.out.println(ttest[i]);

        }

    }


}
