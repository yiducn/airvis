package org.pujun.interp;

import com.mongodb.*;

import java.text.ParseException;
import java.text.SimpleDateFormat;
import java.util.ArrayList;
import java.util.Date;
import java.util.GregorianCalendar;
import java.util.SimpleTimeZone;

/**
 * Created by milletpu on 15/3/25.
 *
 */
public class InterpMeteo {
    private static final String NEW_DB_NAME = "airdb";
    private double[][] spdPoints;
    private double[][] dirPoints;
    private double[] spds;
    private double[] dirs;
    Date date;

    MongoClient client = new MongoClient("127.0.0.1", 27017);
    DB db = client.getDB(NEW_DB_NAME);
    DBCollection meteoCollection = db.getCollection("meteo_data");
    DBCollection meteoStationCollection = db.getCollection("meteo_stations");

    public InterpMeteo(String timePoint) throws ParseException {
        //确定一个时timePoint
        SimpleDateFormat df = new SimpleDateFormat("yyyy-MM-dd HH:mm:ss");
        df.setCalendar(new GregorianCalendar(new SimpleTimeZone(0, "GMT")));
        date = df.parse(timePoint);

        //查询所有站点在此时间下的meteo数据
        BasicDBObject queryData = new BasicDBObject();
        queryData.put("time", date);
        DBCursor dataCursor = meteoCollection.find(queryData);

        //
        BasicDBObject queryLoc = new BasicDBObject();
        DBCursor stationCursor = null;

        DBObject thisStation, thisData;
        ArrayList<double[]> spdPoint = new ArrayList<double[]>();
        ArrayList<double[]> dirPoint = new ArrayList<double[]>();
        ArrayList<double[]> spd = new ArrayList<double[]>();
        ArrayList<double[]> dir = new ArrayList<double[]>();

        while (dataCursor.hasNext()) {//循环同一时间点下的所有的站点（0-403个），存入dataPoint[][]
            //得到站点编号usaf，通过编号查询其经纬度
            thisData = dataCursor.next();
            double thisSpd = Double.parseDouble(thisData.get("spd").toString());
            double thisDir = Double.parseDouble(thisData.get("dir").toString());

            //获得point={lat,lon}, value = spd, value = dir数据
            if (thisSpd != -1) {       //去掉缺失的spd点（缺失的点为－1）
                queryLoc.put("usaf", thisData.get("usaf"));
                stationCursor = meteoStationCollection.find(queryLoc);
                int status = 0;
                while (stationCursor.hasNext()) {
                    thisStation = stationCursor.next();
                    double thisLat = Double.parseDouble(thisStation.get("lat").toString());
                    double thisLon = Double.parseDouble(thisStation.get("lon").toString());
                    double[] thisPoint = {thisLat, thisLon};
                    for (int i=0; i<spdPoint.size(); i++) {
                        if (spdPoint.get(i)[0] == thisPoint[0] && spdPoint.get(i)[1] == thisPoint[1]) {
                            status = 1;
                        }
                    }
                    if (status == 0) {
                        spdPoint.add(thisPoint);
                        spd.add(new double[]{thisSpd});
                    }
                }
            }//此时间下的所有站点依次位置存入point as INPUT x, 风向spd as INPUT y
            if (thisDir != -1) {       //去掉缺失的dir点（缺失的点为－1）
                queryLoc.put("usaf", thisData.get("usaf"));
                stationCursor = meteoStationCollection.find(queryLoc);
                int status = 0;
                while (stationCursor.hasNext()) {
                    thisStation = stationCursor.next();
                    double thisLat = Double.parseDouble(thisStation.get("lat").toString());
                    double thisLon = Double.parseDouble(thisStation.get("lon").toString());
                    double[] thisPoint = {thisLat, thisLon};
                    for (int i=0; i<dirPoint.size(); i++) {
                        if (dirPoint.get(i)[0] == thisPoint[0] && dirPoint.get(i)[1] == thisPoint[1]) {
                            status = 1;
                        }
                    }
                    if (status == 0) {
                        dirPoint.add(thisPoint);
                        dir.add(new double[]{thisDir});
                    }
                }
            }//此时间下的所有站点依次位置存入point as INPUT x, 风向dir as INPUT y
            //有的台站不是同时缺失dir和spd，所以使用两个if分开查询各自对应的有效台站

            //ArrayList形式转为double
            spdPoints = new double[spdPoint.size()][2];
            for (int i = 0; i < spdPoint.size(); i++) {
                spdPoints[i][0] = spdPoint.get(i)[0];
                spdPoints[i][1] = spdPoint.get(i)[1];
            }

            dirPoints = new double[dirPoint.size()][2];
            for (int i = 0; i < dirPoint.size(); i++) {
                dirPoints[i][0] = dirPoint.get(i)[0];
                dirPoints[i][1] = dirPoint.get(i)[1];
            }

            spds = new double[spd.size()];
            for (int i = 0; i < spd.size(); i++) {
                spds[i] = spd.get(i)[0];
            }

            dirs = new double[dir.size()];
            for (int i = 0; i < dir.size(); i++) {
                dirs[i] = dir.get(i)[0];
            }
        }
    }


    public double spd(double interpLat, double interpLon) {
        RBF_multiquadric rbf_multiquadric = new RBF_multiquadric(2);
        RBF_interp rbf_interp_multiquadric = new RBF_interp(spdPoints,spds,rbf_multiquadric);
        double[] pt = {interpLat,interpLon};
        double interpSpd = rbf_interp_multiquadric.interp(pt);

        return interpSpd;
    }

    public double dir(double interpLat, double interpLon) {
        RBF_multiquadric rbf_multiquadric = new RBF_multiquadric(2);
        RBF_interp rbf_interp_multiquadric = new RBF_interp(dirPoints,dirs,rbf_multiquadric);
        double[] pt = {interpLat,interpLon};
        double interpDir = rbf_interp_multiquadric.interp(pt);

        return interpDir;
    }
}