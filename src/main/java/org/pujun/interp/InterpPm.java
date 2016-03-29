package org.pujun.interp;

import com.mongodb.*;

import java.text.ParseException;
import java.text.SimpleDateFormat;
import java.util.ArrayList;
import java.util.Date;
import java.util.GregorianCalendar;
import java.util.SimpleTimeZone;

/**
 * Created by milletpu on 16/3/26.
 */
public class InterpPm {
    private double[][] pm25Points;
    private double[][] pm10Points;
    private double[] pm25s;
    private double[] pm10s;
    Date date;

    MongoClient client = new MongoClient("127.0.0.1", 27017);
    DB db = client.getDB("alldata");
    DBCollection pmCollection = db.getCollection("pm_data");
    DBCollection pmStationCollection = db.getCollection("pm_stations");

    public InterpPm(String timePoint) throws ParseException {
        //确定一个时timePoint
        SimpleDateFormat df = new SimpleDateFormat("yyyy-MM-dd HH:mm:ss");
        df.setCalendar(new GregorianCalendar(new SimpleTimeZone(0, "GMT")));
        date = df.parse(timePoint);

        //查询所有站点在此时间下的pm数据
        BasicDBObject queryData = new BasicDBObject();
        queryData.put("time", date);
        DBCursor dataCursor = pmCollection.find(queryData);

        //
        BasicDBObject queryLoc = new BasicDBObject();
        DBCursor stationCursor = null;

        DBObject thisStation, thisData;
        ArrayList<double[]> pm25Point = new ArrayList<double[]>();
        ArrayList<double[]> pm10Point = new ArrayList<double[]>();
        ArrayList<double[]> pm25 = new ArrayList<double[]>();
        ArrayList<double[]> pm10 = new ArrayList<double[]>();


        while (dataCursor.hasNext()) {//循环同一时间点下的所有的站点（0-403个），存入dataPoint[][]
            //得到站点编号code，通过编号查询其经纬度
            thisData = dataCursor.next();
            double thisPm25 = Double.parseDouble(thisData.get("pm25").toString());
            double thisPm10 = Double.parseDouble(thisData.get("pm10").toString());

            //获得point={lat,lon}, value = pm25, value = pm10数据
            if (thisPm25 != 0) {       //去掉缺失的pm25点（缺失的点为0）

                queryLoc.put("code", thisData.get("code"));
                stationCursor = pmStationCollection.find(queryLoc);
                int status = 0;
                while (stationCursor.hasNext()) {
                    thisStation = stationCursor.next();
                    double thisLat = Double.parseDouble(thisStation.get("lat").toString());
                    double thisLon = Double.parseDouble(thisStation.get("lon").toString());
                    double[] thisPoint = {thisLat, thisLon};
                    for (int i=0; i<pm25Point.size(); i++) {
                        if (pm25Point.get(i)[0] == thisPoint[0] && pm25Point.get(i)[1] == thisPoint[1]) {
                            status = 1;
                        }
                    }//查询是否重复站点
                    if (status == 0) {
                        pm25Point.add(thisPoint);
                        pm25.add(new double[]{thisPm25});      //存入一个pm25
                    }
                }
            }//此时间下的所有站点位置依次存入point as INPUT x, pm25 as INPUT y

            if (thisPm10 != 0) {       //去掉缺失的pm10点（缺失的点为0）
                queryLoc.put("code", thisData.get("code"));
                stationCursor = pmStationCollection.find(queryLoc);
                int status = 0;
                while (stationCursor.hasNext()) {
                    thisStation = stationCursor.next();
                    double thisLat = Double.parseDouble(thisStation.get("lat").toString());
                    double thisLon = Double.parseDouble(thisStation.get("lon").toString());
                    double[] thisPoint = {thisLat, thisLon};
                    for (int i=0; i<pm10Point.size(); i++) {
                        if (pm10Point.get(i)[0] == thisPoint[0] && pm10Point.get(i)[1] == thisPoint[1]) {
                            status = 1;
                        }
                    }
                    if (status == 0) {
                        pm10Point.add(thisPoint);
                        pm10.add(new double[]{thisPm10});
                    }
                }
            }//此时间下的所有站点位置依次存入point as INPUT x, pm10 as INPUT y
            //有的台站不是同时缺失pm10和pm25，所以使用两个if分开查询各自对应的有效台站

            //ArrayList形式转为double
            pm25Points = new double[pm25Point.size()][2];
            for (int i = 0; i < pm25Point.size(); i++) {
                pm25Points[i][0] = pm25Point.get(i)[0];
                pm25Points[i][1] = pm25Point.get(i)[1];
            }

            pm10Points = new double[pm10Point.size()][2];
            for (int i = 0; i < pm10Point.size(); i++) {
                pm10Points[i][0] = pm10Point.get(i)[0];
                pm10Points[i][1] = pm10Point.get(i)[1];
            }

            pm25s = new double[pm25.size()];
            for (int i = 0; i < pm25.size(); i++) {
                pm25s[i] = pm25.get(i)[0];
            }

            pm10s = new double[pm10.size()];
            for (int i = 0; i < pm10.size(); i++) {
                pm10s[i] = pm10.get(i)[0];
            }
        }
    }

    public void pm25(double interpLat, double interpLon) {
        RBF_multiquadric rbf_multiquadric = new RBF_multiquadric();
        RBF_interp rbf_interp_multiquadric = new RBF_interp(pm25Points,pm25s,rbf_multiquadric);
        double[] pt = {interpLat, interpLon};
        System.out.println("The interp pm25 is: " + rbf_interp_multiquadric.interp(pt));
    }

    public void pm10(double interpLat, double interpLon) {
        RBF_multiquadric rbf_multiquadric = new RBF_multiquadric();
        RBF_interp rbf_interp_multiquadric = new RBF_interp(pm10Points,pm10s,rbf_multiquadric);
        double[] pt = {interpLat, interpLon};
        System.out.println("The interp pm10 is: " + rbf_interp_multiquadric.interp(pt));
    }


}
