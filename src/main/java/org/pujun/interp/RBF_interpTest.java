package org.pujun.interp;

import java.text.ParseException;

/**
 * Created by milletpu on 16/3/16.
 *
 * x[][] is the original data point coordinate while y[] is the corresponding value.
 * pt[] is a point to be interpolated.
 *

 */
public class RBF_interpTest {
    protected static long startTimeStamp, endTimeStamp;
    public static void main(String[] args) throws ParseException {
//        startTimeStamp = System.currentTimeMillis();
//
//        InterpMeteo interpMeteo = new InterpMeteo("2013-12-18 06:00:00");    //set a time point
//        System.out.println(interpMeteo.spd(40.080, 116.585));   //9
//        System.out.println(interpMeteo.dir(40.080, 116.585));   //220

        InterpPm interpPm = new InterpPm("2013-12-18 06:00:00");    //code:1017A
        System.out.println(interpPm.pm10(39.1082, 117.237));    //39
        System.out.println(interpPm.pm25(39.1082, 117.237));    //28

//        endTimeStamp = System.currentTimeMillis();
//        System.out.println("total time: " + (endTimeStamp-startTimeStamp) + "ms");


//        double[][] x = {{120,30}, {125,35}};
//        double[] y = {30, 29};
//        double[] pt = {110,39};
//
//        RBF_multiquadric rbf_multiquadric = new RBF_multiquadric();
//        RBF_interp rbf_interp_multiquadric = new RBF_interp(x,y,rbf_multiquadric);
//
//        System.out.println(rbf_interp_multiquadric.interp(pt));

    }
}
