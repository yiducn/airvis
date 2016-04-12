package org.pujun.correl;

import org.apache.commons.math3.stat.correlation.PearsonsCorrelation;
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
    private double[] lagResult = {0,0};

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
     * Input two time seires then get the best lag and its correlation value in return
     * 输入两个数组，计算出最优lag和对应的相关性数值
     * @param x
     * @param y
     * @return LagResult[0]: best lag, lagResult[1]: correlation value
     */
    public double[] getLagResult(double[] x, double[] y){  //arrayY后移lag位，arrayX前端截掉，arrayY后端截掉
        double thisLagResult = 0;
        for (int i = 0; i < x.length/2; i++) {
            x = Arrays.copyOfRange(x, i, x.length);
            y = Arrays.copyOfRange(y, 0, y.length - i);
            PearsonsCorrelation pearsonsCorrelation = new PearsonsCorrelation();
            thisLagResult = pearsonsCorrelation.correlation(x, y);
            if (abs(thisLagResult) > lagResult[1]){
                lagResult[0] = i;
                lagResult[1] = thisLagResult;
            }
        }

        return lagResult;
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
            System.out.println(n);
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

    public static void main(String[] args) throws ParseException {
        double[] x,y;
        Correlation correlation = new Correlation();
        x = correlation.getInterpPM25TimeSeries(40.0239, 116.2202, "2015-02-08 00:00:00", "2015-02-11 09:00:00");
        y = correlation.getInterpPM25TimeSeries(38.1006, 114.4995, "2015-02-08 00:00:00", "2015-02-11 09:00:00");

        double[] lag = correlation.getLagResult(y, x);
        System.out.println(lag[0]);
        System.out.println(lag[1]);
        //1分钟
    }


}
