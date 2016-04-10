package org.pujun.correl;

import org.pujun.interp.InterpPm;

import java.text.ParseException;
import java.text.SimpleDateFormat;
import java.util.*;

/**
 * Created by milletpu on 16/4/10.
 */
public class DataCorrelation {

    public double[] getInterpPM25Data(double lat, double lon, String startTime, String endTime) throws ParseException {
        Date startDate, endDate;
        SimpleDateFormat df = new SimpleDateFormat("yyyy-MM-dd HH:mm:ss");
        df.setCalendar(new GregorianCalendar(new SimpleTimeZone(0, "GMT")));

        startDate = df.parse(startTime);
        endDate = df.parse(endTime);

        ArrayList<Double>  interpPm25ResultList = new ArrayList<Double>();
        InterpPm interpPm = new InterpPm(df.format(startDate));
        Calendar cal = Calendar.getInstance();
        cal.setTime(startDate);
        while(startDate.before(endDate)) {
            interpPm.date = startDate;
            interpPm25ResultList.add(interpPm.pm25(lat, lon)); //(40.0239, 116.2202));

            cal.add(Calendar.DATE, 1);
            startDate = cal.getTime();
            //历史数据中不存在的日期，直接取前一天的数据；存在的可直接计算出？？？
            //如果起始日期就没有，那岂不是完蛋了？？！更改！！
        }

        double[] interpPm25Result = new double[interpPm25ResultList.size()];
        for (int i = 0; i < interpPm25ResultList.size(); i++) {
            interpPm25Result[i] = interpPm25ResultList.get(i);
        }
        return interpPm25Result;
    }

    public static void main(String[] args) throws ParseException {
        double[] x,y;
        DataCorrelation dataCorrelation = new DataCorrelation();
        x = dataCorrelation.getInterpPM25Data(40.0239, 116.2202, "2013-12-18 09:00:00", "2014-01-18 09:00:00");
        y = dataCorrelation.getInterpPM25Data(38.1006, 114.4995, "2013-12-18 09:00:00", "2014-01-18 09:00:00");

        Correlation correlation = new Correlation();
        double[] lag = correlation.getLagResult(x,y);
        System.out.println(lag[0]);
        System.out.println(lag[1]);
        //1分钟

    }
}
